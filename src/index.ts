#!/usr/bin/env node

import { Command, Option } from "commander";

import {
  createAuthorizedClient,
  refreshSessionIfNeeded,
  runInteractiveLogin,
  TASKS_SCOPE,
  updateSessionTokens,
} from "./lib/auth.js";
import { CliError } from "./lib/errors.js";
import { printJson, printTaskLists, printTasks } from "./lib/output.js";
import { getConfigDir, getClientsStorePath, getSessionsStorePath } from "./lib/paths.js";
import {
  parseGoogleCredentialsFile,
} from "./lib/google-credentials.js";
import {
  deleteTask,
  getTask,
  listTaskLists,
  listTasks,
  moveTask,
  resolveTaskList,
  createTask,
  reopenTask,
  updateTask,
  completeTask,
} from "./lib/tasks.js";
import { parseDueFilter, parseDueInput } from "./lib/time.js";
import {
  loadClientsStore,
  loadSessionsStore,
  normalizeClientName,
  removeSession,
  resolveClient,
  resolveClientName,
  resolveSession,
  saveClientsStore,
  saveSessionsStore,
  sessionKey,
} from "./lib/store.js";
import type { AuthSelection, StoredSession } from "./lib/types.js";

interface TaskCommandOptions extends AuthSelection {
  list?: string;
  showCompleted?: boolean;
  dueAfter?: string;
  dueBefore?: string;
  limit?: string;
  title?: string;
  notes?: string;
  due?: string;
  clearDue?: boolean;
  before?: string;
  after?: string;
}

function withAuthOptions(command: Command): Command {
  return command
    .option("--client <name>", "OAuth client name")
    .option("--account <email>", "saved Google account email")
    .option("--json", "print JSON output");
}

function withTaskOptions(command: Command): Command {
  return withAuthOptions(command).option(
    "--list <id-or-title>",
    "task list ID or exact title",
    "@default",
  );
}

async function withAuthorizedSession<T>(
  selection: AuthSelection,
  callback: (input: { authClient: ReturnType<typeof createAuthorizedClient>; session: StoredSession }) => Promise<T>,
): Promise<T> {
  const clientsStore = await loadClientsStore();
  const sessionsStore = await loadSessionsStore();
  const client = resolveClient(clientsStore, selection.client);
  const session = resolveSession(sessionsStore, client.name, selection.account);

  const authClient = createAuthorizedClient(client, session, async (tokens) => {
    const nextStore = await updateSessionTokens(sessionsStore, session, tokens);
    await saveSessionsStore(nextStore);
  });
  await refreshSessionIfNeeded(authClient);
  return callback({ authClient, session });
}

function requireNonEmpty(value: string | undefined, message: string): string {
  if (!value?.trim()) {
    throw new CliError(message);
  }
  return value.trim();
}

function printCreatedConfigPaths(): void {
  console.error(`Config directory: ${getConfigDir()}`);
  console.error(`Clients store: ${getClientsStorePath()}`);
  console.error(`Sessions store: ${getSessionsStorePath()}`);
}

const program = new Command();

program
  .name("gtk")
  .description("BYO-credentials Google Tasks CLI")
  .showHelpAfterError()
  .version("0.1.0");

const auth = program.command("auth").description("Manage OAuth clients and sessions");
const credentials = auth.command("credentials").description("Manage saved OAuth client definitions");

credentials
  .command("add <path>")
  .description("Save a Google Desktop OAuth client JSON")
  .option("--name <name>", "client name", "default")
  .option("--default", "set as the default client")
  .action(async (filePath: string, options: { name: string; default?: boolean }) => {
    const store = await loadClientsStore();
    const name = normalizeClientName(options.name);
    const client = await parseGoogleCredentialsFile(filePath, name);
    const nextStore = {
      ...store,
      clients: {
        ...store.clients,
        [name]: client,
      },
      defaultClient:
        options.default || !store.defaultClient ? name : store.defaultClient,
    };
    await saveClientsStore(nextStore);
    printCreatedConfigPaths();
    console.log(`Saved OAuth client "${name}".`);
  });

withAuthOptions(
  credentials
    .command("ls")
    .alias("list")
    .description("List saved OAuth clients"),
).action(async (options: AuthSelection) => {
  const store = await loadClientsStore();
  const clients = Object.values(store.clients).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const payload = clients.map((client) => ({
    name: client.name,
    projectId: client.projectId ?? null,
    isDefault: store.defaultClient === client.name,
    clientIdTail: client.clientId.slice(-12),
    createdAt: client.createdAt,
  }));
  if (options.json) {
    printJson(payload);
    return;
  }
  if (payload.length === 0) {
    console.log("No OAuth clients saved.");
    return;
  }
  for (const client of payload) {
    const suffix = client.isDefault ? " (default)" : "";
    console.log(`${client.name}${suffix}`);
    console.log(`  project: ${client.projectId ?? "-"}`);
    console.log(`  client_id tail: ${client.clientIdTail}`);
    console.log(`  created: ${client.createdAt}`);
  }
});

withAuthOptions(
  auth.command("login [email]").description("Authenticate a Google account for a saved client"),
).action(async (email: string | undefined, options: AuthSelection) => {
  const clientsStore = await loadClientsStore();
  const sessionsStore = await loadSessionsStore();
  const clientName = resolveClientName(clientsStore, options.client);
  const client = clientsStore.clients[clientName]!;
  const loginResult = await runInteractiveLogin(client, email);
  const key = sessionKey(clientName, loginResult.email);
  const nextSessionsStore = {
    ...sessionsStore,
    defaultAccountByClient: {
      ...sessionsStore.defaultAccountByClient,
      [clientName]: loginResult.email,
    },
    sessions: {
      ...sessionsStore.sessions,
      [key]: {
        clientName,
        email: loginResult.email,
        scopes: loginResult.scopes,
        tokens: loginResult.tokens,
        updatedAt: new Date().toISOString(),
      },
    },
  };
  await saveSessionsStore(nextSessionsStore);
  if (email && email.trim().toLowerCase() !== loginResult.email) {
    console.error(`Requested login hint: ${email}`);
    console.error(`Authorized account: ${loginResult.email}`);
  }
  console.log(`Saved session for ${loginResult.email} on client "${clientName}".`);
});

withAuthOptions(
  auth.command("status").description("Show the current saved session state"),
).action(async (options: AuthSelection) => {
  const clientsStore = await loadClientsStore();
  const sessionsStore = await loadSessionsStore();
  const client = resolveClient(clientsStore, options.client);
  const session = resolveSession(sessionsStore, client.name, options.account);

  const authClient = createAuthorizedClient(client, session, async (tokens) => {
    const nextStore = await updateSessionTokens(sessionsStore, session, tokens);
    await saveSessionsStore(nextStore);
  });
  await refreshSessionIfNeeded(authClient);

  const payload = {
    client: client.name,
    projectId: client.projectId ?? null,
    email: session.email,
    hasRefreshToken: Boolean(session.tokens.refresh_token),
    scopes: session.scopes,
    tasksScopeGranted: session.scopes.includes(TASKS_SCOPE),
    updatedAt: session.updatedAt,
  };
  if (options.json) {
    printJson(payload);
    return;
  }
  console.log(`client: ${payload.client}`);
  console.log(`project: ${payload.projectId ?? "-"}`);
  console.log(`email: ${payload.email}`);
  console.log(`has refresh token: ${payload.hasRefreshToken ? "yes" : "no"}`);
  console.log(`tasks scope granted: ${payload.tasksScopeGranted ? "yes" : "no"}`);
  console.log(`updated: ${payload.updatedAt}`);
});

withAuthOptions(
  auth.command("logout").description("Remove a saved Google account session"),
).action(async (options: AuthSelection) => {
  const clientsStore = await loadClientsStore();
  const sessionsStore = await loadSessionsStore();
  const clientName = resolveClientName(clientsStore, options.client);
  const session = resolveSession(sessionsStore, clientName, options.account);
  const nextStore = removeSession(sessionsStore, clientName, session.email);
  await saveSessionsStore(nextStore);
  console.log(`Removed saved session for ${session.email} on client "${clientName}".`);
});

const lists = program.command("lists").description("Manage Google task lists");

withAuthOptions(
  lists.command("ls").alias("list").description("List task lists"),
).action(async (options: AuthSelection) => {
  await withAuthorizedSession(options, async ({ authClient }) => {
    const taskLists = await listTaskLists(authClient);
    if (options.json) {
      printJson(taskLists);
      return;
    }
    printTaskLists(taskLists);
  });
});

const tasks = program.command("tasks").description("Manage Google Tasks");

withTaskOptions(
  tasks.command("ls").alias("list").description("List tasks in a task list"),
)
  .addOption(new Option("--show-completed", "include completed tasks"))
  .option("--due-after <date-or-rfc3339>", "minimum due date")
  .option("--due-before <date-or-rfc3339>", "maximum due date")
  .option("--limit <count>", "maximum number of tasks to return", "100")
  .action(async (options: TaskCommandOptions) => {
    await withAuthorizedSession(options, async ({ authClient }) => {
      const taskList = await resolveTaskList(authClient, options.list);
      const listOptions: {
        listId: string;
        showCompleted?: boolean;
        dueMin?: string;
        dueMax?: string;
        limit: number;
      } = {
        listId: taskList.id,
        limit: Number.parseInt(options.limit ?? "100", 10),
      };
      if (options.showCompleted) {
        listOptions.showCompleted = true;
      }
      if (options.dueAfter) {
        listOptions.dueMin = parseDueFilter(options.dueAfter, "min");
      }
      if (options.dueBefore) {
        listOptions.dueMax = parseDueFilter(options.dueBefore, "max");
      }
      const taskItems = await listTasks(authClient, listOptions);
      if (options.json) {
        printJson({
          list: taskList,
          items: taskItems,
        });
        return;
      }
      console.log(`Task list: ${taskList.title} (${taskList.id})`);
      printTasks(taskItems);
    });
  });

withTaskOptions(
  tasks.command("add").description("Create a task"),
)
  .requiredOption("--title <text>", "task title")
  .option("--notes <text>", "task notes")
  .option("--due <date-or-rfc3339>", "task due date")
  .action(async (options: TaskCommandOptions) => {
    await withAuthorizedSession(options, async ({ authClient }) => {
      const taskList = await resolveTaskList(authClient, options.list);
      const createInput: {
        title: string;
        notes?: string;
        due?: string;
      } = {
        title: requireNonEmpty(options.title, "Pass --title <text>."),
      };
      if (options.notes !== undefined) {
        createInput.notes = options.notes;
      }
      if (options.due) {
        createInput.due = parseDueInput(options.due);
      }
      const task = await createTask(authClient, taskList.id, createInput);
      if (options.json) {
        printJson(task);
        return;
      }
      console.log(`Created task ${task.id} in ${taskList.title}.`);
      printTasks([task]);
    });
  });

withTaskOptions(
  tasks.command("update <taskId>").description("Update a task"),
)
  .option("--title <text>", "new task title")
  .option("--notes <text>", "new task notes")
  .option("--due <date-or-rfc3339>", "new due date")
  .option("--clear-due", "clear the due date")
  .action(async (taskId: string, options: TaskCommandOptions) => {
    if (!options.title && options.notes === undefined && !options.due && !options.clearDue) {
      throw new CliError("Pass at least one of --title, --notes, --due, or --clear-due.");
    }
    if (options.due && options.clearDue) {
      throw new CliError('Pass only one of "--due" or "--clear-due".');
    }
    await withAuthorizedSession(options, async ({ authClient }) => {
      const taskList = await resolveTaskList(authClient, options.list);
      const updateInput: {
        title?: string;
        notes?: string;
        due?: string | null;
      } = {};
      if (options.title !== undefined) {
        updateInput.title = options.title;
      }
      if (options.notes !== undefined) {
        updateInput.notes = options.notes;
      }
      if (options.clearDue) {
        updateInput.due = null;
      } else if (options.due) {
        updateInput.due = parseDueInput(options.due);
      }
      const task = await updateTask(authClient, taskList.id, taskId, updateInput);
      if (options.json) {
        printJson(task);
        return;
      }
      console.log(`Updated task ${task.id} in ${taskList.title}.`);
      printTasks([task]);
    });
  });

withTaskOptions(
  tasks.command("done <taskId>").description("Mark a task completed"),
).action(async (taskId: string, options: TaskCommandOptions) => {
  await withAuthorizedSession(options, async ({ authClient }) => {
    const taskList = await resolveTaskList(authClient, options.list);
    const task = await completeTask(authClient, taskList.id, taskId);
    if (options.json) {
      printJson(task);
      return;
    }
    console.log(`Completed task ${task.id} in ${taskList.title}.`);
    printTasks([task]);
  });
});

withTaskOptions(
  tasks.command("reopen <taskId>").description("Reopen a completed task"),
).action(async (taskId: string, options: TaskCommandOptions) => {
  await withAuthorizedSession(options, async ({ authClient }) => {
    const taskList = await resolveTaskList(authClient, options.list);
    const task = await reopenTask(authClient, taskList.id, taskId);
    if (options.json) {
      printJson(task);
      return;
    }
    console.log(`Reopened task ${task.id} in ${taskList.title}.`);
    printTasks([task]);
  });
});

withTaskOptions(
  tasks.command("delete <taskId>").description("Delete a task"),
).action(async (taskId: string, options: TaskCommandOptions) => {
  await withAuthorizedSession(options, async ({ authClient }) => {
    const taskList = await resolveTaskList(authClient, options.list);
    await deleteTask(authClient, taskList.id, taskId);
    if (options.json) {
      printJson({
        deleted: true,
        taskId,
        listId: taskList.id,
      });
      return;
    }
    console.log(`Deleted task ${taskId} from ${taskList.title}.`);
  });
});

withTaskOptions(
  tasks.command("move <taskId>").description("Reorder a task relative to another task"),
)
  .option("--before <task-id>", "move before the given task")
  .option("--after <task-id>", "move after the given task")
  .action(async (taskId: string, options: TaskCommandOptions) => {
    await withAuthorizedSession(options, async ({ authClient }) => {
      const taskList = await resolveTaskList(authClient, options.list);
      const moveInput: {
        before?: string;
        after?: string;
      } = {};
      if (options.before) {
        moveInput.before = options.before;
      }
      if (options.after) {
        moveInput.after = options.after;
      }
      const task = await moveTask(authClient, taskList.id, taskId, moveInput);
      if (options.json) {
        printJson(task);
        return;
      }
      console.log(`Moved task ${task.id} in ${taskList.title}.`);
      printTasks([task]);
    });
  });

withTaskOptions(
  tasks.command("get <taskId>").description("Fetch a single task"),
).action(async (taskId: string, options: TaskCommandOptions) => {
  await withAuthorizedSession(options, async ({ authClient }) => {
    const taskList = await resolveTaskList(authClient, options.list);
    const task = await getTask(authClient, taskList.id, taskId);
    if (options.json) {
      printJson(task);
      return;
    }
    printTasks([task]);
  });
});

program.parseAsync(process.argv).catch((error: unknown) => {
  if (error instanceof CliError) {
    console.error(error.message);
    process.exitCode = error.exitCode;
    return;
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

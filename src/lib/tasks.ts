import type { OAuth2Client } from "google-auth-library";
import { google, type tasks_v1 } from "googleapis";

import { CliError } from "./errors.js";
import type { TaskListSummary, TaskSummary } from "./types.js";

function getTasksApi(auth: OAuth2Client): tasks_v1.Tasks {
  return google.tasks({ version: "v1", auth });
}

function toTaskListSummary(item: tasks_v1.Schema$TaskList): TaskListSummary {
  return {
    id: item.id ?? "",
    title: item.title ?? "",
    updated: item.updated ?? undefined,
  };
}

function toTaskSummary(item: tasks_v1.Schema$Task): TaskSummary {
  return {
    id: item.id ?? "",
    title: item.title ?? "",
    status: item.status ?? undefined,
    due: item.due ?? null,
    completed: item.completed ?? null,
    notes: item.notes ?? null,
    parent: item.parent ?? null,
    position: item.position ?? null,
    deleted: item.deleted ?? null,
    hidden: item.hidden ?? null,
    updated: item.updated ?? undefined,
  };
}

export function selectTaskList(
  taskLists: TaskListSummary[],
  identifier: string,
): TaskListSummary {
  if (identifier === "@default") {
    return {
      id: "@default",
      title: "@default",
    };
  }

  const byId = taskLists.find((taskList) => taskList.id === identifier);
  if (byId) {
    return byId;
  }

  const byTitle = taskLists.filter((taskList) => taskList.title === identifier);
  if (byTitle.length === 1) {
    return byTitle[0]!;
  }
  if (byTitle.length > 1) {
    const titles = byTitle.map((taskList) => `${taskList.title} (${taskList.id})`).join(", ");
    throw new CliError(`Task list "${identifier}" is ambiguous. Matches: ${titles}`);
  }
  throw new CliError(`Task list "${identifier}" not found.`);
}

export async function listTaskLists(auth: OAuth2Client): Promise<TaskListSummary[]> {
  const api = getTasksApi(auth);
  const items: TaskListSummary[] = [];
  let pageToken: string | undefined;

  do {
    const params: tasks_v1.Params$Resource$Tasklists$List = {
      maxResults: 100,
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }
    const response = await api.tasklists.list(params);
    for (const item of response.data.items ?? []) {
      items.push(toTaskListSummary(item));
    }
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return items;
}

export async function resolveTaskList(
  auth: OAuth2Client,
  identifier = "@default",
): Promise<TaskListSummary> {
  if (identifier === "@default") {
    return {
      id: "@default",
      title: "@default",
    };
  }

  return selectTaskList(await listTaskLists(auth), identifier);
}

export interface ListTasksOptions {
  listId: string;
  showCompleted?: boolean;
  dueMin?: string;
  dueMax?: string;
  limit?: number;
}

export async function listTasks(
  auth: OAuth2Client,
  options: ListTasksOptions,
): Promise<TaskSummary[]> {
  const api = getTasksApi(auth);
  const items: TaskSummary[] = [];
  let pageToken: string | undefined;
  const pageSize = Math.min(options.limit ?? 100, 100);

  do {
    const params: tasks_v1.Params$Resource$Tasks$List = {
      tasklist: options.listId,
      maxResults: pageSize,
      showCompleted: options.showCompleted ?? false,
      showDeleted: false,
      showHidden: options.showCompleted ?? false,
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }
    if (options.dueMin) {
      params.dueMin = options.dueMin;
    }
    if (options.dueMax) {
      params.dueMax = options.dueMax;
    }

    const response = await api.tasks.list(params);

    for (const item of response.data.items ?? []) {
      items.push(toTaskSummary(item));
      if (options.limit && items.length >= options.limit) {
        return items;
      }
    }
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return items;
}

export async function getTask(
  auth: OAuth2Client,
  listId: string,
  taskId: string,
): Promise<TaskSummary> {
  const api = getTasksApi(auth);
  try {
    const response = await api.tasks.get({
      tasklist: listId,
      task: taskId,
    });
    return toTaskSummary(response.data);
  } catch (error) {
    throw new CliError(`Task "${taskId}" not found in list "${listId}".`, 1);
  }
}

export async function createTask(
  auth: OAuth2Client,
  listId: string,
  input: { title: string; notes?: string; due?: string },
): Promise<TaskSummary> {
  const api = getTasksApi(auth);
  const requestBody: tasks_v1.Schema$Task = {
    title: input.title,
  };
  if (input.notes !== undefined) {
    requestBody.notes = input.notes;
  }
  if (input.due) {
    requestBody.due = input.due;
  }
  const response = await api.tasks.insert({
    tasklist: listId,
    requestBody,
  });
  return toTaskSummary(response.data);
}

export async function updateTask(
  auth: OAuth2Client,
  listId: string,
  taskId: string,
  input: { title?: string; notes?: string; due?: string | null },
): Promise<TaskSummary> {
  const api = getTasksApi(auth);
  const requestBody: tasks_v1.Schema$Task = {};
  if (input.title !== undefined) {
    requestBody.title = input.title;
  }
  if (input.notes !== undefined) {
    requestBody.notes = input.notes;
  }
  if (input.due !== undefined) {
    requestBody.due = input.due as string | null;
  }
  const response = await api.tasks.patch({
    tasklist: listId,
    task: taskId,
    requestBody,
  });
  return toTaskSummary(response.data);
}

export async function completeTask(
  auth: OAuth2Client,
  listId: string,
  taskId: string,
): Promise<TaskSummary> {
  const api = getTasksApi(auth);
  const response = await api.tasks.patch({
    tasklist: listId,
    task: taskId,
    requestBody: {
      status: "completed",
      completed: new Date().toISOString(),
    },
  });
  return toTaskSummary(response.data);
}

export async function reopenTask(
  auth: OAuth2Client,
  listId: string,
  taskId: string,
): Promise<TaskSummary> {
  const api = getTasksApi(auth);
  const response = await api.tasks.patch({
    tasklist: listId,
    task: taskId,
    requestBody: {
      status: "needsAction",
      completed: null as unknown as string,
    } as tasks_v1.Schema$Task,
  });
  return toTaskSummary(response.data);
}

export async function deleteTask(
  auth: OAuth2Client,
  listId: string,
  taskId: string,
): Promise<void> {
  const api = getTasksApi(auth);
  await api.tasks.delete({
    tasklist: listId,
    task: taskId,
  });
}

function findPreviousSiblingId(
  tasks: TaskSummary[],
  targetTask: TaskSummary,
): string | undefined {
  const siblings = tasks
    .filter((task) => (task.parent ?? null) === (targetTask.parent ?? null))
    .sort((left, right) => (left.position ?? "").localeCompare(right.position ?? ""));
  const index = siblings.findIndex((task) => task.id === targetTask.id);
  if (index <= 0) {
    return undefined;
  }
  return siblings[index - 1]?.id;
}

export async function moveTask(
  auth: OAuth2Client,
  listId: string,
  taskId: string,
  input: { before?: string; after?: string },
): Promise<TaskSummary> {
  if ((input.before ? 1 : 0) + (input.after ? 1 : 0) !== 1) {
    throw new CliError('Pass exactly one of "--before <task-id>" or "--after <task-id>".');
  }

  const api = getTasksApi(auth);
  let parent: string | undefined;
  let previous: string | undefined;

  if (input.after) {
    const anchor = await getTask(auth, listId, input.after);
    parent = anchor.parent ?? undefined;
    previous = anchor.id;
  } else if (input.before) {
    const anchor = await getTask(auth, listId, input.before);
    const tasks = await listTasks(auth, {
      listId,
      showCompleted: true,
    });
    parent = anchor.parent ?? undefined;
    previous = findPreviousSiblingId(tasks, anchor);
  }

  const params: tasks_v1.Params$Resource$Tasks$Move = {
    tasklist: listId,
    task: taskId,
  };
  if (parent) {
    params.parent = parent;
  }
  if (previous) {
    params.previous = previous;
  }
  const response = await api.tasks.move(params);
  return toTaskSummary(response.data);
}

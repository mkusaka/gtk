import fs from "node:fs/promises";
import path from "node:path";

import { CliError } from "./errors.js";
import { getClientsStorePath, getSessionsStorePath } from "./paths.js";
import type {
  ClientsStore,
  SessionsStore,
  StoredClient,
  StoredSession,
  StoredTokens,
} from "./types.js";

const EMPTY_CLIENTS_STORE: ClientsStore = {
  version: 1,
  clients: {},
};

const EMPTY_SESSIONS_STORE: SessionsStore = {
  version: 1,
  defaultAccountByClient: {},
  sessions: {},
};

async function ensureParentDirectory(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureParentDirectory(filePath);
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function loadClientsStore(): Promise<ClientsStore> {
  return readJsonFile(getClientsStorePath(), EMPTY_CLIENTS_STORE);
}

export async function saveClientsStore(store: ClientsStore): Promise<void> {
  await writeJsonFile(getClientsStorePath(), store);
}

export async function loadSessionsStore(): Promise<SessionsStore> {
  return readJsonFile(getSessionsStorePath(), EMPTY_SESSIONS_STORE);
}

export async function saveSessionsStore(store: SessionsStore): Promise<void> {
  await writeJsonFile(getSessionsStorePath(), store);
}

export function normalizeClientName(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  if (!normalized) {
    throw new CliError("Client name must not be empty.");
  }
  return normalized;
}

export function sessionKey(clientName: string, email: string): string {
  return `${clientName}:${email.trim().toLowerCase()}`;
}

export function resolveClientName(store: ClientsStore, requested?: string): string {
  if (requested) {
    const name = normalizeClientName(requested);
    if (!(name in store.clients)) {
      throw new CliError(`Unknown client "${name}". Register it with "gtk auth credentials add".`);
    }
    return name;
  }

  if (store.defaultClient && store.clients[store.defaultClient]) {
    return store.defaultClient;
  }

  const clientNames = Object.keys(store.clients);
  if (clientNames.length === 1) {
    return clientNames[0]!;
  }
  if (clientNames.length === 0) {
    throw new CliError('No OAuth clients configured. Run "gtk auth credentials add <path>".');
  }
  throw new CliError('Multiple OAuth clients configured. Pass "--client <name>".');
}

export function resolveClient(store: ClientsStore, requested?: string): StoredClient {
  return store.clients[resolveClientName(store, requested)]!;
}

export function listSessionsForClient(
  store: SessionsStore,
  clientName: string,
): StoredSession[] {
  return Object.values(store.sessions)
    .filter((session) => session.clientName === clientName)
    .sort((left, right) => left.email.localeCompare(right.email));
}

export function resolveSessionEmail(
  store: SessionsStore,
  clientName: string,
  requested?: string,
): string {
  if (requested) {
    const email = requested.trim().toLowerCase();
    const key = sessionKey(clientName, email);
    if (!store.sessions[key]) {
      throw new CliError(`No saved session for "${email}" on client "${clientName}".`);
    }
    return email;
  }

  const defaultAccount = store.defaultAccountByClient[clientName];
  if (defaultAccount && store.sessions[sessionKey(clientName, defaultAccount)]) {
    return defaultAccount;
  }

  const sessions = listSessionsForClient(store, clientName);
  if (sessions.length === 1) {
    return sessions[0]!.email;
  }
  if (sessions.length === 0) {
    throw new CliError(
      `No saved session for client "${clientName}". Run "gtk auth login --client ${clientName}".`,
    );
  }
  throw new CliError(
    `Multiple sessions saved for client "${clientName}". Pass "--account <email>".`,
  );
}

export function resolveSession(
  store: SessionsStore,
  clientName: string,
  requested?: string,
): StoredSession {
  return store.sessions[sessionKey(clientName, resolveSessionEmail(store, clientName, requested))]!;
}

export function mergeTokens(
  current: StoredTokens,
  incoming: StoredTokens,
): StoredTokens {
  const merged: StoredTokens = {
    ...current,
    ...incoming,
  };
  const refreshToken = incoming.refresh_token ?? current.refresh_token;
  if (refreshToken) {
    merged.refresh_token = refreshToken;
  }
  return merged;
}

export function removeSession(
  store: SessionsStore,
  clientName: string,
  email: string,
): SessionsStore {
  const key = sessionKey(clientName, email);
  const next: SessionsStore = {
    version: store.version,
    defaultAccountByClient: { ...store.defaultAccountByClient },
    sessions: { ...store.sessions },
  };
  delete next.sessions[key];
  if (next.defaultAccountByClient[clientName] === email) {
    delete next.defaultAccountByClient[clientName];
    const remaining = listSessionsForClient(next, clientName);
    if (remaining[0]) {
      next.defaultAccountByClient[clientName] = remaining[0].email;
    }
  }
  return next;
}

export interface StoredClient {
  name: string;
  clientId: string;
  clientSecret: string;
  projectId?: string | undefined;
  createdAt: string;
}

export interface ClientsStore {
  version: 1;
  defaultClient?: string;
  clients: Record<string, StoredClient>;
}

export interface StoredTokens {
  access_token?: string | undefined;
  refresh_token?: string | undefined;
  scope?: string | undefined;
  token_type?: string | undefined;
  id_token?: string | undefined;
  expiry_date?: number | null;
}

export interface StoredSession {
  clientName: string;
  email: string;
  scopes: string[];
  tokens: StoredTokens;
  updatedAt: string;
}

export interface SessionsStore {
  version: 1;
  defaultAccountByClient: Record<string, string>;
  sessions: Record<string, StoredSession>;
}

export interface AuthSelection {
  client?: string;
  account?: string;
  json?: boolean;
}

export interface TaskListSummary {
  id: string;
  title: string;
  updated?: string | undefined;
}

export interface TaskSummary {
  id: string;
  title: string;
  status?: string | undefined;
  due?: string | null;
  completed?: string | null;
  notes?: string | null;
  parent?: string | null;
  position?: string | null;
  deleted?: boolean | null;
  hidden?: boolean | null;
  updated?: string | undefined;
}

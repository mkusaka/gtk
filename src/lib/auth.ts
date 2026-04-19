import http from "node:http";
import { URL } from "node:url";

import { OAuth2Client, type Credentials } from "google-auth-library";
import { google } from "googleapis";
import open from "open";

import { CliError } from "./errors.js";
import { mergeTokens } from "./store.js";
import type {
  SessionsStore,
  StoredClient,
  StoredSession,
  StoredTokens,
} from "./types.js";

export const TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";
export const DEFAULT_SCOPES = [TASKS_SCOPE, "openid", "email"];

const CALLBACK_PATH = "/oauth2callback";
const CALLBACK_SUCCESS = `<!doctype html>
<html>
  <body>
    <h1>gtk authentication complete</h1>
    <p>You can close this window and return to the terminal.</p>
  </body>
</html>
`;

function toStoredTokens(tokens: OAuth2Client["credentials"]): StoredTokens {
  const stored: StoredTokens = {
    expiry_date: tokens.expiry_date ?? null,
  };
  if (tokens.access_token) {
    stored.access_token = tokens.access_token;
  }
  if (tokens.refresh_token) {
    stored.refresh_token = tokens.refresh_token;
  }
  if (tokens.scope) {
    stored.scope = tokens.scope;
  }
  if (tokens.token_type) {
    stored.token_type = tokens.token_type;
  }
  if (tokens.id_token) {
    stored.id_token = tokens.id_token;
  }
  return stored;
}

function toGoogleCredentials(tokens: StoredTokens): Credentials {
  const credentials: Credentials = {
    expiry_date: tokens.expiry_date ?? null,
  };
  if (tokens.access_token) {
    credentials.access_token = tokens.access_token;
  }
  if (tokens.refresh_token) {
    credentials.refresh_token = tokens.refresh_token;
  }
  if (tokens.scope) {
    credentials.scope = tokens.scope;
  }
  if (tokens.token_type) {
    credentials.token_type = tokens.token_type;
  }
  if (tokens.id_token) {
    credentials.id_token = tokens.id_token;
  }
  return credentials;
}

async function waitForAuthorizationCode(
  server: http.Server,
  timeoutMs: number,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new CliError("Timed out waiting for the OAuth callback."));
    }, timeoutMs);

    server.on("request", (request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== CALLBACK_PATH) {
        response.statusCode = 404;
        response.end("Not found");
        return;
      }

      const error = url.searchParams.get("error");
      if (error) {
        response.statusCode = 400;
        response.end(`Authorization failed: ${error}`);
        clearTimeout(timer);
        reject(new CliError(`Authorization failed: ${error}`));
        return;
      }

      const code = url.searchParams.get("code");
      if (!code) {
        response.statusCode = 400;
        response.end("Missing authorization code.");
        clearTimeout(timer);
        reject(new CliError("Missing authorization code in OAuth callback."));
        return;
      }

      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(CALLBACK_SUCCESS);
      clearTimeout(timer);
      resolve(code);
    });
  }).finally(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });
}

async function openBrowser(url: string): Promise<void> {
  try {
    await open(url);
  } catch {
    // Fall back to printing the URL; the caller already prints it.
  }
}

export async function runInteractiveLogin(
  client: StoredClient,
  loginHint?: string,
): Promise<{ email: string; scopes: string[]; tokens: StoredTokens }> {
  const server = http.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new CliError("Failed to start local OAuth callback server.");
  }

  const redirectUri = `http://127.0.0.1:${address.port}${CALLBACK_PATH}`;
  const authClient = new OAuth2Client({
    clientId: client.clientId,
    clientSecret: client.clientSecret,
    redirectUri,
  });
  const authUrlOptions = {
    access_type: "offline",
    prompt: "consent",
    scope: DEFAULT_SCOPES,
  } as {
    access_type: "offline";
    prompt: "consent";
    scope: string[];
    login_hint?: string;
  };
  if (loginHint) {
    authUrlOptions.login_hint = loginHint;
  }
  const authUrl = authClient.generateAuthUrl(authUrlOptions);

  console.error("Open this URL if the browser does not open automatically:");
  console.error(authUrl);
  await openBrowser(authUrl);

  const code = await waitForAuthorizationCode(server, 180_000);
  const tokenResponse = await authClient.getToken(code);
  authClient.setCredentials(tokenResponse.tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: authClient });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email?.trim().toLowerCase();
  if (!email) {
    throw new CliError("Google did not return an email address for this session.");
  }

  return {
    email,
    scopes: DEFAULT_SCOPES,
    tokens: toStoredTokens(authClient.credentials),
  };
}

export function createAuthorizedClient(
  client: StoredClient,
  session: StoredSession,
  onTokenRefresh: (tokens: StoredTokens) => Promise<void>,
): OAuth2Client {
  const authClient = new OAuth2Client({
    clientId: client.clientId,
    clientSecret: client.clientSecret,
  });
  authClient.setCredentials(toGoogleCredentials(session.tokens));
  authClient.on("tokens", (tokens) => {
    void onTokenRefresh(mergeTokens(session.tokens, toStoredTokens(tokens)));
  });
  return authClient;
}

export async function refreshSessionIfNeeded(
  authClient: OAuth2Client,
): Promise<void> {
  try {
    await authClient.getAccessToken();
  } catch (error) {
    const message = (error as Error).message;
    throw new CliError(
      `Failed to use the saved Google session. Re-authenticate with "gtk auth login".\n${message}`,
    );
  }
}

export async function updateSessionTokens(
  store: SessionsStore,
  session: StoredSession,
  tokens: StoredTokens,
): Promise<SessionsStore> {
  const key = `${session.clientName}:${session.email}`;
  return {
    version: store.version,
    defaultAccountByClient: { ...store.defaultAccountByClient },
    sessions: {
      ...store.sessions,
      [key]: {
        ...session,
        tokens,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

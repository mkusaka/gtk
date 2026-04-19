import fs from "node:fs/promises";

import { CliError } from "./errors.js";
import type { StoredClient } from "./types.js";

interface GoogleInstalledCredentials {
  client_id?: string;
  client_secret?: string;
  project_id?: string;
}

interface GoogleCredentialsFile {
  installed?: GoogleInstalledCredentials;
  web?: GoogleInstalledCredentials;
}

export async function parseGoogleCredentialsFile(
  filePath: string,
  name: string,
): Promise<StoredClient> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as GoogleCredentialsFile;
  const installed = parsed.installed ?? parsed.web;
  if (!installed?.client_id || !installed.client_secret) {
    throw new CliError(
      "Unsupported credentials file. Expect a Google Desktop OAuth client JSON with client_id and client_secret.",
    );
  }

  const client: StoredClient = {
    name,
    clientId: installed.client_id,
    clientSecret: installed.client_secret,
    createdAt: new Date().toISOString(),
  };
  if (installed.project_id) {
    client.projectId = installed.project_id;
  }
  return client;
}

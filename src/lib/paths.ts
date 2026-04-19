import os from "node:os";
import path from "node:path";

export function getConfigDir(): string {
  return process.env.GTK_CONFIG_DIR ?? path.join(os.homedir(), ".config", "gtk");
}

export function getClientsStorePath(): string {
  return path.join(getConfigDir(), "clients.json");
}

export function getSessionsStorePath(): string {
  return path.join(getConfigDir(), "sessions.json");
}

import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { getClientsStorePath, getConfigDir, getSessionsStorePath } from "../src/lib/paths.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("paths", () => {
  it("uses GTK_CONFIG_DIR when set", () => {
    vi.stubEnv("GTK_CONFIG_DIR", "/tmp/gtk-config");

    expect(getConfigDir()).toBe("/tmp/gtk-config");
    expect(getClientsStorePath()).toBe(path.join("/tmp/gtk-config", "clients.json"));
    expect(getSessionsStorePath()).toBe(path.join("/tmp/gtk-config", "sessions.json"));
  });
});

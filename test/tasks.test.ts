import { describe, expect, it } from "vitest";

import { CliError } from "../src/lib/errors.js";
import { selectTaskList } from "../src/lib/tasks.js";

describe("selectTaskList", () => {
  const taskLists = [
    { id: "alpha", title: "Inbox" },
    { id: "beta", title: "Personal" },
  ];

  it("prefers an exact ID match", () => {
    expect(selectTaskList(taskLists, "beta")).toEqual({
      id: "beta",
      title: "Personal",
    });
  });

  it("matches an exact title", () => {
    expect(selectTaskList(taskLists, "Inbox")).toEqual({
      id: "alpha",
      title: "Inbox",
    });
  });

  it("returns the special default task list", () => {
    expect(selectTaskList(taskLists, "@default")).toEqual({
      id: "@default",
      title: "@default",
    });
  });

  it("throws when no task list matches", () => {
    expect(() => selectTaskList(taskLists, "Missing")).toThrow(CliError);
  });
});

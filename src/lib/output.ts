import { formatDateTime } from "./time.js";
import type { TaskListSummary, TaskSummary } from "./types.js";

function truncate(value: string, width: number): string {
  if (value.length <= width) {
    return value;
  }
  return `${value.slice(0, width - 1)}…`;
}

function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ? row[index]!.length : 0))),
  );

  const lines = [
    headers.map((header, index) => header.padEnd(widths[index]!)).join("  "),
    widths.map((width) => "-".repeat(width)).join("  "),
  ];

  for (const row of rows) {
    lines.push(row.map((cell, index) => cell.padEnd(widths[index]!)).join("  "));
  }

  return lines.join("\n");
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function printTaskLists(lists: TaskListSummary[]): void {
  if (lists.length === 0) {
    console.log("No task lists found.");
    return;
  }
  const rows = lists.map((taskList) => [
    taskList.title,
    taskList.id,
    formatDateTime(taskList.updated),
  ]);
  console.log(renderTable(["TITLE", "ID", "UPDATED"], rows));
}

export function printTasks(tasks: TaskSummary[]): void {
  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }

  const rows = tasks.map((task) => [
    task.id,
    truncate(task.title, 48),
    task.status ?? "",
    formatDateTime(task.due),
    formatDateTime(task.completed),
  ]);
  console.log(renderTable(["ID", "TITLE", "STATUS", "DUE", "COMPLETED"], rows));
}

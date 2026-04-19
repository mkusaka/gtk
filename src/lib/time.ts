import { CliError } from "./errors.js";

function parseDateInput(value: string): Date {
  const raw = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new CliError(`Invalid date/time value "${value}". Use YYYY-MM-DD or RFC3339.`);
  }
  return parsed;
}

export function parseDueInput(value: string): string {
  return parseDateInput(value).toISOString();
}

export function parseDueFilter(value: string, boundary: "min" | "max"): string {
  const raw = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const hour = boundary === "min" ? 0 : 23;
    const minute = boundary === "min" ? 0 : 59;
    const second = boundary === "min" ? 0 : 59;
    const millisecond = boundary === "min" ? 0 : 999;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      hour,
      minute,
      second,
      millisecond,
    ).toISOString();
  }
  return parseDueInput(raw);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(
    parsed.getHours(),
  )}:${pad(parsed.getMinutes())}`;
}

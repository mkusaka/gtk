import { describe, expect, it } from "vitest";

import { parseDueFilter, parseDueInput } from "../src/lib/time.js";

describe("time helpers", () => {
  it("parses RFC3339 due timestamps", () => {
    expect(parseDueInput("2026-04-20T10:30:00Z")).toBe("2026-04-20T10:30:00.000Z");
  });

  it("parses date-only due timestamps as local midnight", () => {
    expect(parseDueInput("2026-04-20")).toMatch(/^2026-04-(19|20|21)T/);
  });

  it("expands date-only max filters to end of day", () => {
    expect(parseDueFilter("2026-04-20", "max")).toMatch(/T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

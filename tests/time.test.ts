import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatClock,
  parseDuration,
  parseEstimateMinutes,
  loggedSeconds,
  parseLoggedSeconds,
  formatWorkDate,
  parseWorkDate,
  ownDaySeconds,
  rollupLoggedSeconds,
  rollupLoggedByUser,
  elapsedWeekdays,
  weekRemainingSeconds,
} from "@/lib/time";

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(9000)).toBe("2h 30m");
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(2700)).toBe("45m");
    expect(formatDuration(0)).toBe("0m");
  });
  it("shows seconds only when under a minute", () => {
    expect(formatDuration(30)).toBe("30s");
    expect(formatDuration(90)).toBe("1m");
  });
});

describe("formatClock", () => {
  it("formats mm:ss under an hour", () => {
    expect(formatClock(125)).toBe("2:05");
    expect(formatClock(59)).toBe("0:59");
  });
  it("formats h:mm:ss over an hour", () => {
    expect(formatClock(3725)).toBe("1:02:05");
  });
});

describe("parseDuration", () => {
  it("parses combined units", () => {
    expect(parseDuration("1h 30m")).toBe(5400);
    expect(parseDuration("2h")).toBe(7200);
    expect(parseDuration("45m")).toBe(2700);
  });
  it("treats a bare number as minutes", () => {
    expect(parseDuration("90")).toBe(5400);
  });
  it("parses decimal hours", () => {
    expect(parseDuration("1.5h")).toBe(5400);
  });
  it("parses clock form h:mm", () => {
    expect(parseDuration("1:30")).toBe(5400);
  });
  it("parses seconds", () => {
    expect(parseDuration("30s")).toBe(30);
  });
  it("returns null for junk", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
  });
});

describe("parseEstimateMinutes", () => {
  it("treats a bare number as hours", () => {
    expect(parseEstimateMinutes("8")).toBe(480);
    expect(parseEstimateMinutes("1.5")).toBe(90);
  });
  it("parses unit suffixes", () => {
    expect(parseEstimateMinutes("2h 30m")).toBe(150);
    expect(parseEstimateMinutes("45m")).toBe(45);
  });
  it("returns null for empty or junk", () => {
    expect(parseEstimateMinutes("")).toBeNull();
    expect(parseEstimateMinutes("abc")).toBeNull();
  });
});

describe("loggedSeconds", () => {
  it("sums finished entries", () => {
    expect(
      loggedSeconds([
        { duration: 3600, startedAt: "2026-09-01T00:00:00Z", endedAt: "2026-09-01T01:00:00Z" },
        { duration: 1800, startedAt: "2026-09-01T02:00:00Z", endedAt: "2026-09-01T02:30:00Z" },
      ]),
    ).toBe(5400);
  });
  it("includes elapsed time for a running timer", () => {
    const now = Date.parse("2026-09-01T01:00:00Z");
    expect(
      loggedSeconds(
        [{ duration: 0, startedAt: "2026-09-01T00:30:00Z", endedAt: null }],
        now,
      ),
    ).toBe(1800);
  });
  it("returns 0 for an empty list", () => {
    expect(loggedSeconds([])).toBe(0);
  });
});

describe("parseLoggedSeconds", () => {
  it("treats a bare number as hours", () => {
    expect(parseLoggedSeconds("2")).toBe(7200);
    expect(parseLoggedSeconds("0.5")).toBe(1800);
  });
  it("parses unit suffixes", () => {
    expect(parseLoggedSeconds("1h 30m")).toBe(5400);
    expect(parseLoggedSeconds("45m")).toBe(2700);
  });
  it("returns null for empty or junk", () => {
    expect(parseLoggedSeconds("")).toBeNull();
    expect(parseLoggedSeconds("abc")).toBeNull();
  });
});

describe("workDate", () => {
  it("round-trips YYYY-MM-DD as a UTC date", () => {
    const d = parseWorkDate("2026-09-16");
    expect(formatWorkDate(d)).toBe("2026-09-16");
  });
});

describe("ownDaySeconds", () => {
  const entries = [
    { duration: 3600, startedAt: "2026-09-16T01:00:00Z", endedAt: "2026-09-16T02:00:00Z", userId: "a", workDate: "2026-09-16" },
    { duration: 1800, startedAt: "2026-09-16T03:00:00Z", endedAt: "2026-09-16T03:30:00Z", userId: "b", workDate: "2026-09-16" },
    { duration: 7200, startedAt: "2026-09-15T01:00:00Z", endedAt: "2026-09-15T03:00:00Z", userId: "a", workDate: "2026-09-15" },
  ];
  it("sums only the current user's rows on that work date", () => {
    expect(ownDaySeconds(entries, "a", "2026-09-16")).toBe(3600);
    expect(ownDaySeconds(entries, "b", "2026-09-16")).toBe(1800);
    expect(ownDaySeconds(entries, "a", "2026-09-15")).toBe(7200);
  });
  it("returns 0 when the user has no row that day", () => {
    expect(ownDaySeconds(entries, "a", "2026-09-14")).toBe(0);
  });
});

describe("rollupLoggedSeconds", () => {
  const tasks = [
    { id: "p", parentId: null },
    { id: "c1", parentId: "p" },
    { id: "g", parentId: "c1" },
    { id: "c2", parentId: "p" },
  ];
  const entries = [
    { taskId: "p", duration: 600, startedAt: "2026-09-16T00:00:00Z", endedAt: "2026-09-16T00:10:00Z" },
    { taskId: "c1", duration: 3600, startedAt: "2026-09-16T00:00:00Z", endedAt: "2026-09-16T01:00:00Z" },
    { taskId: "g", duration: 1800, startedAt: "2026-09-16T00:00:00Z", endedAt: "2026-09-16T00:30:00Z" },
    { taskId: "c2", duration: 1200, startedAt: "2026-09-16T00:00:00Z", endedAt: "2026-09-16T00:20:00Z" },
  ];
  it("adds own hours plus every descendant, not only direct children", () => {
    const totals = rollupLoggedSeconds(tasks, entries);
    expect(totals.p).toBe(600 + 3600 + 1800 + 1200);
    expect(totals.c1).toBe(3600 + 1800);
    expect(totals.g).toBe(1800);
    expect(totals.c2).toBe(1200);
  });
  it("does not copy child rows onto the parent map of own entries", () => {
    expect(entries.filter((e) => e.taskId === "p")).toHaveLength(1);
  });
});

describe("rollupLoggedByUser", () => {
  const tasks = [
    { id: "p", parentId: null },
    { id: "c", parentId: "p" },
  ];
  const entries = [
    { taskId: "p", userId: "a", duration: 600, startedAt: "2026-09-16T00:00:00Z", endedAt: "2026-09-16T00:10:00Z" },
    { taskId: "c", userId: "a", duration: 3600, startedAt: "2026-09-16T00:00:00Z", endedAt: "2026-09-16T01:00:00Z" },
    { taskId: "c", userId: "b", duration: 1800, startedAt: "2026-09-16T00:00:00Z", endedAt: "2026-09-16T00:30:00Z" },
  ];
  it("splits the descendant rollup per person", () => {
    const byUser = rollupLoggedByUser(tasks, entries);
    expect(byUser.p).toEqual({ a: 4200, b: 1800 });
    expect(byUser.c).toEqual({ a: 3600, b: 1800 });
  });
});

describe("elapsedWeekdays", () => {
  it("counts Mon–Fri through today inside the week", () => {
    expect(elapsedWeekdays("2026-09-14", "2026-09-20", "2026-09-16")).toBe(3); // Mon–Wed
    expect(elapsedWeekdays("2026-09-14", "2026-09-20", "2026-09-14")).toBe(1);
    expect(elapsedWeekdays("2026-09-14", "2026-09-20", "2026-09-19")).toBe(5); // Sat → all weekdays
  });
  it("counts a past week as five weekdays", () => {
    expect(elapsedWeekdays("2026-09-07", "2026-09-13", "2026-09-16")).toBe(5);
  });
  it("counts a future week as zero", () => {
    expect(elapsedWeekdays("2026-09-21", "2026-09-27", "2026-09-16")).toBe(0);
  });
});

describe("weekRemainingSeconds", () => {
  it("is elapsed weekdays times the daily cap minus filled seconds", () => {
    const capMinutes = 600; // 10h
    expect(weekRemainingSeconds({ filledSeconds: 8 * 3600, capMinutes, from: "2026-09-14", to: "2026-09-20", today: "2026-09-16" })).toBe(
      3 * 10 * 3600 - 8 * 3600,
    );
  });
  it("does not go below zero when over-filled", () => {
    expect(weekRemainingSeconds({ filledSeconds: 40 * 3600, capMinutes: 600, from: "2026-09-14", to: "2026-09-20", today: "2026-09-16" })).toBe(0);
  });
});

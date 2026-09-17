import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { parseWorkDate } from "@/lib/time";
import {
  upsertDayLog,
  startTimer,
  stopTimer,
  getUserTimesheet,
  getWorkspaceTimesheet,
  remainingDaySeconds,
} from "@/lib/timesheet";
import { ApiError } from "@/lib/api-helpers";

let userId: string;
let otherId: string;
let workspaceId: string;
let listId: string;
let statusId: string;
let taskA: string;
let taskB: string;
let childId: string;

beforeAll(async () => {
  const stamp = Date.now();
  const user = await prisma.user.create({
    data: { email: `ts-${stamp}@example.com`, name: "Timesheet User" },
  });
  const other = await prisma.user.create({
    data: { email: `ts-o-${stamp}@example.com`, name: "Timesheet Other" },
  });
  userId = user.id;
  otherId = other.id;

  const workspace = await prisma.workspace.create({
    data: { name: "Timesheet WS", dailyHourCapMinutes: 600 },
  });
  workspaceId = workspace.id;
  await prisma.workspaceMember.create({
    data: { workspaceId, userId, role: "OWNER" },
  });
  await prisma.workspaceMember.create({
    data: { workspaceId, userId: otherId, role: "MEMBER" },
  });
  const space = await prisma.space.create({ data: { workspaceId, name: "TS Space" } });
  const list = await prisma.list.create({ data: { spaceId: space.id, name: "TS List" } });
  listId = list.id;
  const status = await prisma.status.create({
    data: { listId, name: "To Do", type: "NOT_STARTED", position: 0 },
  });
  statusId = status.id;
  const parent = await prisma.task.create({
    data: { listId, statusId, name: "Parent", position: 1 },
  });
  const child = await prisma.task.create({
    data: { listId, statusId, name: "Child", parentId: parent.id, position: 2 },
  });
  const sibling = await prisma.task.create({
    data: { listId, statusId, name: "Other task", position: 3 },
  });
  taskA = parent.id;
  childId = child.id;
  taskB = sibling.id;
});

afterAll(async () => {
  await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await prisma.user.delete({ where: { id: otherId } }).catch(() => {});
});

describe("upsertDayLog", () => {
  it("sets the day's hours instead of appending another row", async () => {
    await upsertDayLog({ taskId: taskA, userId, workDate: "2026-09-16", durationSeconds: 3600 });
    await upsertDayLog({ taskId: taskA, userId, workDate: "2026-09-16", durationSeconds: 7200 });
    const rows = await prisma.timeEntry.findMany({
      where: { taskId: taskA, userId, workDate: parseWorkDate("2026-09-16") },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].duration).toBe(7200);
  });

  it("clears the day when duration is 0", async () => {
    await upsertDayLog({ taskId: taskA, userId, workDate: "2026-09-15", durationSeconds: 1800 });
    const cleared = await upsertDayLog({ taskId: taskA, userId, workDate: "2026-09-15", durationSeconds: 0 });
    expect(cleared).toBeNull();
    const rows = await prisma.timeEntry.findMany({
      where: { taskId: taskA, userId, workDate: parseWorkDate("2026-09-15") },
    });
    expect(rows).toHaveLength(0);
  });

  it("rejects when the user's hours that day would exceed the workspace cap", async () => {
    await upsertDayLog({ taskId: taskA, userId, workDate: "2026-09-14", durationSeconds: 8 * 3600 });
    await expect(
      upsertDayLog({ taskId: taskB, userId, workDate: "2026-09-14", durationSeconds: 3 * 3600 }),
    ).rejects.toBeInstanceOf(ApiError);
    const remaining = await remainingDaySeconds(userId, workspaceId, "2026-09-14");
    expect(remaining).toBe(2 * 3600);
  });
});

describe("timer merge", () => {
  it("folds a stopped timer into that day's unique row", async () => {
    await upsertDayLog({ taskId: taskB, userId, workDate: "2026-09-13", durationSeconds: 600 });
    const started = await startTimer(taskB, userId, new Date("2026-09-13T08:00:00Z"));
    expect(started.endedAt).toBeNull();
    expect(started.duration).toBe(600);
    const stopped = await stopTimer(taskB, userId, new Date("2026-09-13T08:10:00Z"));
    expect(stopped.duration).toBe(600 + 600);
    expect(stopped.endedAt).not.toBeNull();
    const rows = await prisma.timeEntry.findMany({
      where: { taskId: taskB, userId, workDate: parseWorkDate("2026-09-13") },
    });
    expect(rows).toHaveLength(1);
  });
});

describe("timesheet queries", () => {
  it("returns per-day totals for the current user", async () => {
    const sheet = await getUserTimesheet(userId, "2026-09-14", "2026-09-16");
    const byDate = Object.fromEntries(sheet.days.map((d) => [d.date, d.seconds]));
    expect(sheet.capMinutes).toBe(600);
    expect(byDate["2026-09-16"]).toBe(7200);
    expect(byDate["2026-09-14"]).toBe(8 * 3600);
  });

  it("returns every workspace member for an admin timesheet", async () => {
    await upsertDayLog({ taskId: childId, userId: otherId, workDate: "2026-09-16", durationSeconds: 1800 });
    const sheet = await getWorkspaceTimesheet(workspaceId, "2026-09-16", "2026-09-16");
    const me = sheet.members.find((m) => m.userId === userId);
    const them = sheet.members.find((m) => m.userId === otherId);
    expect(me?.days["2026-09-16"]).toBe(7200);
    expect(them?.days["2026-09-16"]).toBe(1800);
  });
});

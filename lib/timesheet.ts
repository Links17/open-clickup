import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import {
  formatWorkDate,
  loggedSeconds,
  parseWorkDate,
  rollupLoggedByUser,
  rollupLoggedSeconds,
  todayWorkDate,
  type TimeEntryLite,
} from "@/lib/time";

const userSelect = {
  id: true,
  name: true,
  email: true,
  color: true,
  avatarUrl: true,
} as const;

export type TimesheetDay = { date: string; seconds: number };
export type UserTimesheet = { capMinutes: number; days: TimesheetDay[] };
export type WorkspaceTimesheetMember = {
  userId: string;
  name: string;
  color: string;
  days: Record<string, number>;
};
export type WorkspaceTimesheet = {
  capMinutes: number;
  members: WorkspaceTimesheetMember[];
};

async function workspaceForTask(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { list: { select: { space: { select: { workspaceId: true } } } } },
  });
  if (!task) throw new ApiError(404, "Task not found");
  return task.list.space.workspaceId;
}

export async function workspaceCapMinutes(workspaceId: string): Promise<number> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { dailyHourCapMinutes: true },
  });
  return ws?.dailyHourCapMinutes ?? 600;
}

function asLite(e: {
  duration: number;
  startedAt: Date;
  endedAt: Date | null;
}): TimeEntryLite {
  return { duration: e.duration, startedAt: e.startedAt, endedAt: e.endedAt };
}

export async function userDayLoggedSeconds(userId: string, workDate: string, now = Date.now()): Promise<number> {
  const rows = await prisma.timeEntry.findMany({
    where: { userId, workDate: parseWorkDate(workDate) },
    select: { duration: true, startedAt: true, endedAt: true },
  });
  return loggedSeconds(rows.map(asLite), now);
}

export async function remainingDaySeconds(
  userId: string,
  workspaceId: string,
  workDate: string,
  exceptTaskId?: string,
  now = Date.now(),
): Promise<number> {
  const cap = await workspaceCapMinutes(workspaceId);
  const rows = await prisma.timeEntry.findMany({
    where: {
      userId,
      workDate: parseWorkDate(workDate),
      ...(exceptTaskId ? { taskId: { not: exceptTaskId } } : {}),
    },
    select: { duration: true, startedAt: true, endedAt: true },
  });
  const used = loggedSeconds(rows.map(asLite), now);
  return Math.max(0, cap * 60 - used);
}

async function assertUnderCap(
  userId: string,
  workspaceId: string,
  workDate: string,
  nextSeconds: number,
  exceptTaskId: string,
  now = Date.now(),
) {
  const remaining = await remainingDaySeconds(userId, workspaceId, workDate, exceptTaskId, now);
  if (nextSeconds > remaining) {
    throw new ApiError(
      400,
      `Daily hour cap exceeded. ${Math.round(remaining / 60)} minutes remaining.`,
    );
  }
}

export async function upsertDayLog(input: {
  taskId: string;
  userId: string;
  workDate: string;
  durationSeconds: number;
  description?: string;
}) {
  if (input.durationSeconds < 0) throw new ApiError(400, "Duration cannot be negative");
  const workspaceId = await workspaceForTask(input.taskId);
  const workDate = parseWorkDate(input.workDate);

  if (input.durationSeconds === 0) {
    await prisma.timeEntry.deleteMany({
      where: { taskId: input.taskId, userId: input.userId, workDate },
    });
    return null;
  }

  await assertUnderCap(input.userId, workspaceId, input.workDate, input.durationSeconds, input.taskId);

  const now = new Date();
  return prisma.timeEntry.upsert({
    where: {
      taskId_userId_workDate: { taskId: input.taskId, userId: input.userId, workDate },
    },
    create: {
      taskId: input.taskId,
      userId: input.userId,
      workDate,
      duration: input.durationSeconds,
      description: input.description,
      startedAt: new Date(now.getTime() - input.durationSeconds * 1000),
      endedAt: now,
    },
    update: {
      duration: input.durationSeconds,
      description: input.description,
      endedAt: now,
      startedAt: new Date(now.getTime() - input.durationSeconds * 1000),
    },
    include: { user: { select: userSelect } },
  });
}

export async function startTimer(taskId: string, userId: string, now = new Date()) {
  const workspaceId = await workspaceForTask(taskId);
  const workDateStr = todayWorkDate(now);
  const remaining = await remainingDaySeconds(userId, workspaceId, workDateStr, undefined, now.getTime());
  if (remaining <= 0) {
    throw new ApiError(400, "Daily hour cap exceeded. 0 minutes remaining.");
  }

  const running = await prisma.timeEntry.findFirst({
    where: { userId, endedAt: null },
  });
  if (running) {
    await stopTimer(running.taskId, userId, now);
  }

  const workDate = parseWorkDate(workDateStr);
  const existing = await prisma.timeEntry.findUnique({
    where: { taskId_userId_workDate: { taskId, userId, workDate } },
  });
  if (existing) {
    return prisma.timeEntry.update({
      where: { id: existing.id },
      data: { endedAt: null, startedAt: now },
      include: { user: { select: userSelect } },
    });
  }
  return prisma.timeEntry.create({
    data: { taskId, userId, workDate, duration: 0, startedAt: now, endedAt: null },
    include: { user: { select: userSelect } },
  });
}

export async function stopTimer(taskId: string, userId: string, now = new Date()) {
  const running = await prisma.timeEntry.findFirst({
    where: { taskId, userId, endedAt: null },
  });
  if (!running) throw new ApiError(400, "No running timer for this task");

  const elapsed = Math.max(0, Math.round((now.getTime() - running.startedAt.getTime()) / 1000));
  const next = running.duration + elapsed;
  const workDateStr = formatWorkDate(running.workDate);
  const workspaceId = await workspaceForTask(taskId);
  await assertUnderCap(userId, workspaceId, workDateStr, next, taskId, now.getTime());

  return prisma.timeEntry.update({
    where: { id: running.id },
    data: { endedAt: now, duration: next },
    include: { user: { select: userSelect } },
  });
}

function groupDaySeconds(
  rows: { workDate: Date; duration: number; startedAt: Date; endedAt: Date | null }[],
  now = Date.now(),
): Record<string, number> {
  const byDate: Record<string, typeof rows> = {};
  for (const row of rows) {
    const date = formatWorkDate(row.workDate);
    (byDate[date] ??= []).push(row);
  }
  const out: Record<string, number> = {};
  for (const [date, list] of Object.entries(byDate)) {
    out[date] = loggedSeconds(list.map(asLite), now);
  }
  return out;
}

export async function getUserTimesheet(userId: string, from: string, to: string): Promise<UserTimesheet> {
  const membership = await prisma.workspaceMember.findFirst({ where: { userId } });
  const capMinutes = membership ? await workspaceCapMinutes(membership.workspaceId) : 600;
  const rows = await prisma.timeEntry.findMany({
    where: {
      userId,
      workDate: { gte: parseWorkDate(from), lte: parseWorkDate(to) },
    },
    select: { workDate: true, duration: true, startedAt: true, endedAt: true },
  });
  const grouped = groupDaySeconds(rows);
  const days: TimesheetDay[] = [];
  for (const [date, seconds] of Object.entries(grouped)) {
    days.push({ date, seconds });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  return { capMinutes, days };
}

export async function getWorkspaceTimesheet(
  workspaceId: string,
  from: string,
  to: string,
): Promise<WorkspaceTimesheet> {
  const capMinutes = await workspaceCapMinutes(workspaceId);
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, color: true } } },
    orderBy: { createdAt: "asc" },
  });
  const rows = await prisma.timeEntry.findMany({
    where: {
      userId: { in: members.map((m) => m.userId) },
      workDate: { gte: parseWorkDate(from), lte: parseWorkDate(to) },
    },
    select: { userId: true, workDate: true, duration: true, startedAt: true, endedAt: true },
  });
  const byUser = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }
  return {
    capMinutes,
    members: members.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      color: m.user.color,
      days: groupDaySeconds(byUser.get(m.userId) ?? []),
    })),
  };
}

export async function descendantTaskIds(rootIds: string[]): Promise<string[]> {
  const found = new Set(rootIds);
  let frontier = [...rootIds];
  while (frontier.length) {
    const children = await prisma.task.findMany({
      where: { parentId: { in: frontier }, archived: false },
      select: { id: true },
    });
    frontier = children.map((c) => c.id).filter((id) => !found.has(id));
    for (const id of frontier) found.add(id);
  }
  return [...found];
}

export async function listTimeGraph(listId: string) {
  const nodes = await prisma.task.findMany({
    where: { listId, archived: false },
    select: { id: true, parentId: true },
  });
  const entries = await prisma.timeEntry.findMany({
    where: { taskId: { in: nodes.map((n) => n.id) } },
    select: {
      taskId: true,
      userId: true,
      duration: true,
      startedAt: true,
      endedAt: true,
      workDate: true,
    },
  });
  return { nodes, entries };
}

export type LoggedByUser = { userId: string; seconds: number };

export async function rollupForTaskIds(taskIds: string[]) {
  if (taskIds.length === 0) {
    return { nodes: [] as { id: string; parentId: string | null }[], entries: [] as never[], totals: {} as Record<string, number>, byUser: {} as Record<string, Record<string, number>> };
  }
  const ids = await descendantTaskIds(taskIds);
  const nodes = await prisma.task.findMany({
    where: { id: { in: ids } },
    select: { id: true, parentId: true },
  });
  const entries = await prisma.timeEntry.findMany({
    where: { taskId: { in: ids } },
    select: {
      taskId: true,
      userId: true,
      duration: true,
      startedAt: true,
      endedAt: true,
      workDate: true,
    },
  });
  return {
    nodes,
    entries,
    totals: rollupLoggedSeconds(nodes, entries),
    byUser: rollupLoggedByUser(nodes, entries),
  };
}

function byUserList(byUser: Record<string, number> | undefined): LoggedByUser[] {
  return Object.entries(byUser ?? {})
    .filter(([, seconds]) => seconds > 0)
    .map(([userId, seconds]) => ({ userId, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
}

export function attachLoggedRollup<T extends { id: string; subtasks?: { id: string }[] }>(
  tasks: T[],
  totals: Record<string, number>,
  byUser: Record<string, Record<string, number>>,
): Array<T & { loggedTotal: number; loggedByUser: LoggedByUser[] }> {
  return tasks.map((task) => ({
    ...task,
    loggedTotal: totals[task.id] ?? 0,
    loggedByUser: byUserList(byUser[task.id]),
    ...(task.subtasks
      ? {
          subtasks: task.subtasks.map((sub) => ({
            ...sub,
            loggedTotal: totals[sub.id] ?? 0,
            loggedByUser: byUserList(byUser[sub.id]),
          })),
        }
      : {}),
  }));
}

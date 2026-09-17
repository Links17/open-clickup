// Duration helpers for time tracking. Internally we work in seconds.

/** Format seconds as a compact human string: "2h 30m", "45m", "1h", "30s". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s === 0) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!h && !m && sec) parts.push(`${sec}s`);
  return parts.join(" ") || "0m";
}

/** Format seconds as a live clock for a running timer: "1:23:45" or "12:05". */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Parse a human duration into seconds. Accepts "1h 30m", "90m", "2h", "45",
 * "1.5h", "1:30" (h:m). Returns null when nothing usable is found.
 */
export function parseDuration(input: string): number | null {
  const str = input.trim().toLowerCase();
  if (!str) return null;

  // "h:mm" clock form
  const clock = str.match(/^(\d+):([0-5]?\d)$/);
  if (clock) return parseInt(clock[1], 10) * 3600 + parseInt(clock[2], 10) * 60;

  let total = 0;
  let matched = false;
  const re = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|seconds)?/g;
  let mch: RegExpExecArray | null;
  while ((mch = re.exec(str)) !== null) {
    if (!mch[0].trim()) continue;
    const value = parseFloat(mch[1]);
    if (Number.isNaN(value)) continue;
    const unit = mch[2] ?? "m"; // bare number → minutes
    matched = true;
    if (unit.startsWith("h")) total += value * 3600;
    else if (unit.startsWith("s")) total += value;
    else total += value * 60;
  }
  return matched ? Math.round(total) : null;
}

/**
 * Parse a review estimate into minutes. A bare number is hours
 * (评审预估 convention). Unit suffixes fall back to parseDuration.
 */
export function parseEstimateMinutes(input: string): number | null {
  const str = input.trim().toLowerCase();
  if (!str) return null;
  if (/^\d+(?:\.\d+)?$/.test(str)) return Math.round(parseFloat(str) * 60);
  const sec = parseDuration(str);
  if (sec === null) return null;
  return Math.max(0, Math.round(sec / 60));
}

export function formatEstimate(minutes: number | null | undefined): string {
  if (minutes == null || minutes === 0) return "";
  return formatDuration(minutes * 60);
}

export type TimeEntryLite = {
  duration: number;
  startedAt: string | Date;
  endedAt: string | Date | null;
  userId?: string;
  taskId?: string;
  workDate?: string | Date | null;
};

export type TaskNode = { id: string; parentId: string | null };

/** Parse YYYY-MM-DD as UTC midnight. */
export function parseWorkDate(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) throw new Error(`Invalid work date: ${isoDate}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** Format a Date (UTC calendar day or ISO string) as YYYY-MM-DD. */
export function formatWorkDate(d: Date | string): string {
  if (typeof d === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    return formatWorkDate(new Date(d));
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's calendar date in the given IANA timezone (default Asia/Shanghai). */
export function todayWorkDate(now = new Date(), timeZone = "Asia/Shanghai"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

function utcDay(isoDate: string): number {
  return parseWorkDate(isoDate).getUTCDay(); // 0 Sun … 6 Sat
}

function isWeekday(isoDate: string): boolean {
  const day = utcDay(isoDate);
  return day !== 0 && day !== 6;
}

function shiftWorkDate(isoDate: string, days: number): string {
  const d = parseWorkDate(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return formatWorkDate(d);
}

export function eachDateInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = shiftWorkDate(cur, 1);
  }
  return out;
}

/** Monday–Sunday week containing `isoDate` (UTC calendar). */
export function weekBounds(isoDate: string): { from: string; to: string } {
  const day = utcDay(isoDate); // Sun=0
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const from = shiftWorkDate(isoDate, mondayOffset);
  return { from, to: shiftWorkDate(from, 6) };
}

function entryWorkDate(e: TimeEntryLite): string | null {
  if (e.workDate) return formatWorkDate(e.workDate);
  if (e.startedAt) return formatWorkDate(e.startedAt);
  return null;
}

/** Sum logged seconds. Running timers (endedAt=null) count stored duration plus elapsed time to `now`. */
export function loggedSeconds(entries: TimeEntryLite[], now = Date.now()): number {
  return entries.reduce((sum, e) => {
    if (e.endedAt == null) {
      return sum + e.duration + Math.max(0, Math.round((now - new Date(e.startedAt).getTime()) / 1000));
    }
    return sum + e.duration;
  }, 0);
}

/** Parse a logged-time input into seconds. Bare number = hours, matching 预估工时. */
export function parseLoggedSeconds(input: string): number | null {
  const minutes = parseEstimateMinutes(input);
  if (minutes === null) return null;
  return minutes * 60;
}

/** Seconds this user logged on a single work date (this task's entries only). */
export function ownDaySeconds(entries: TimeEntryLite[], userId: string, workDate: string, now = Date.now()): number {
  return loggedSeconds(
    entries.filter((e) => e.userId === userId && entryWorkDate(e) === workDate),
    now,
  );
}

function childrenOf(tasks: TaskNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const t of tasks) {
    if (!t.parentId) continue;
    const list = map.get(t.parentId) ?? [];
    list.push(t.id);
    map.set(t.parentId, list);
  }
  return map;
}

function subtreeIds(rootId: string, kids: Map<string, string[]>): string[] {
  const out = [rootId];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of kids.get(id) ?? []) {
      out.push(child);
      stack.push(child);
    }
  }
  return out;
}

function entriesByTask(entries: Array<TimeEntryLite & { taskId: string }>): Map<string, TimeEntryLite[]> {
  const map = new Map<string, TimeEntryLite[]>();
  for (const e of entries) {
    const list = map.get(e.taskId) ?? [];
    list.push(e);
    map.set(e.taskId, list);
  }
  return map;
}

/** Own + all descendant logged seconds, keyed by task id. */
export function rollupLoggedSeconds(
  tasks: TaskNode[],
  entries: Array<TimeEntryLite & { taskId: string }>,
  now = Date.now(),
): Record<string, number> {
  const kids = childrenOf(tasks);
  const byTask = entriesByTask(entries);
  const out: Record<string, number> = {};
  for (const t of tasks) {
    let total = 0;
    for (const id of subtreeIds(t.id, kids)) {
      total += loggedSeconds(byTask.get(id) ?? [], now);
    }
    out[t.id] = total;
  }
  return out;
}

/** Own + descendant logged seconds grouped by userId, keyed by task id. */
export function rollupLoggedByUser(
  tasks: TaskNode[],
  entries: Array<TimeEntryLite & { taskId: string; userId: string }>,
  now = Date.now(),
): Record<string, Record<string, number>> {
  const kids = childrenOf(tasks);
  const byTask = entriesByTask(entries);
  const out: Record<string, Record<string, number>> = {};
  for (const t of tasks) {
    const byUser: Record<string, number> = {};
    for (const id of subtreeIds(t.id, kids)) {
      for (const e of byTask.get(id) ?? []) {
        if (!e.userId) continue;
        byUser[e.userId] = (byUser[e.userId] ?? 0) + loggedSeconds([e], now);
      }
    }
    out[t.id] = byUser;
  }
  return out;
}

/** Count Mon–Fri dates in [from, to] that are on or before `today`. */
export function elapsedWeekdays(from: string, to: string, today: string): number {
  const end = today < to ? today : to;
  if (end < from) return 0;
  let n = 0;
  for (const d of eachDateInclusive(from, end)) {
    if (isWeekday(d)) n += 1;
  }
  return n;
}

export function weekRemainingSeconds(input: {
  filledSeconds: number;
  capMinutes: number;
  from: string;
  to: string;
  today: string;
}): number {
  const quota = elapsedWeekdays(input.from, input.to, input.today) * input.capMinutes * 60;
  return Math.max(0, quota - input.filledSeconds);
}

export function displayLoggedTotal(task: { loggedTotal?: number; timeEntries?: TimeEntryLite[] }): number {
  return task.loggedTotal ?? loggedSeconds(task.timeEntries ?? []);
}

export function byUserTitle(
  byUser: { userId: string; seconds: number }[] | undefined,
  names: Record<string, string>,
): string | undefined {
  if (!byUser?.length) return undefined;
  return byUser.map((u) => `${names[u.userId] ?? u.userId}: ${formatDuration(u.seconds)}`).join("\n");
}

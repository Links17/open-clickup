"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clock, Play, Square, Pencil } from "lucide-react";
import { apiSend } from "@/lib/api";
import type { TaskDetail } from "@/lib/queries";
import {
  formatDuration,
  formatClock,
  formatEstimate,
  parseEstimateMinutes,
  parseLoggedSeconds,
  todayWorkDate,
  formatWorkDate,
  loggedSeconds,
} from "@/lib/time";
import { Avatar } from "@/components/ui/avatar";
import { useT } from "@/lib/i18n";

type TimeEntry = TaskDetail["timeEntries"][number];

export function TimeTracking({
  taskId,
  currentUserId,
  timeEstimate,
  entries,
  subtreeEntries,
  loggedTotal,
  loggedByUser,
  onChange,
}: {
  taskId: string;
  currentUserId: string;
  timeEstimate: number | null;
  entries: TimeEntry[];
  subtreeEntries: TaskDetail["subtreeEntries"];
  loggedTotal: number;
  loggedByUser: { userId: string; seconds: number }[];
  onChange: () => void;
}) {
  const running = entries.find((e) => e.endedAt === null);
  const myRunning = running && running.userId === currentUserId;
  const allEntries = subtreeEntries ?? entries;
  const total = loggedTotal ?? loggedSeconds(allEntries);
  const estimateSec = (timeEstimate ?? 0) * 60;
  const t = useT();
  const names = useMemo(() => {
    const map: Record<string, { name: string; user: TimeEntry["user"] }> = {};
    for (const e of allEntries) {
      map[e.userId] = { name: e.user.name, user: e.user };
    }
    return map;
  }, [allEntries]);

  const start = useMutation({
    mutationFn: () => apiSend(`/api/tasks/${taskId}/time`, "POST", { action: "start" }),
    onSuccess: onChange,
  });
  const stop = useMutation({
    mutationFn: () => apiSend(`/api/tasks/${taskId}/time`, "POST", { action: "stop" }),
    onSuccess: onChange,
  });
  const log = useMutation({
    mutationFn: (v: { durationSeconds: number; workDate: string }) =>
      apiSend(`/api/tasks/${taskId}/time`, "POST", { action: "log", ...v }),
    onSuccess: onChange,
  });
  const setEstimate = useMutation({
    mutationFn: (minutes: number | null) =>
      apiSend(`/api/tasks/${taskId}`, "PATCH", { timeEstimate: minutes }),
    onSuccess: onChange,
  });

  const ownByDate = useMemo(() => {
    const map = new Map<string, TimeEntry>();
    for (const e of entries.filter((row) => row.userId === currentUserId)) {
      map.set(formatWorkDate(e.workDate), e);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries, currentUserId]);

  const othersByDate = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const e of allEntries.filter((row) => row.userId !== currentUserId)) {
      const day = formatWorkDate(e.workDate);
      const list = map.get(day) ?? [];
      list.push(e);
      map.set(day, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [allEntries, currentUserId]);

  return (
    <section className="mt-6">
      <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-cu-text-secondary">
        <Clock className="h-4 w-4" /> {t("time.title")}
      </h3>

      <div className="rounded-lg border border-cu-border p-3">
        <div className="flex items-center gap-4 text-[13px]">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-cu-text-tertiary">{t("time.total")}</div>
            <LiveTotal entries={allEntries} fallback={total} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-cu-text-tertiary">{t("time.estimate")}</div>
            <EstimateEditor minutes={timeEstimate} onSave={(m) => setEstimate.mutate(m)} />
          </div>
          <div className="ml-auto">
            {myRunning ? (
              <button
                onClick={() => stop.mutate()}
                className="flex items-center gap-1.5 rounded-md bg-cu-urgent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
              >
                <Square className="h-3.5 w-3.5 fill-current" /> {t("time.stop")}
              </button>
            ) : (
              <button
                onClick={() => start.mutate()}
                disabled={start.isPending}
                className="flex items-center gap-1.5 rounded-md bg-cu-purple px-3 py-1.5 text-[13px] font-medium text-white hover:bg-cu-purple-dark disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> {t("time.startTimer")}
              </button>
            )}
          </div>
        </div>

        {estimateSec > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cu-hover-strong">
            <div
              className={`h-full rounded-full ${total > estimateSec ? "bg-cu-urgent" : "bg-cu-purple"}`}
              style={{ width: `${Math.min(100, (total / estimateSec) * 100)}%` }}
            />
          </div>
        )}

        {loggedByUser.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-cu-text-tertiary">{t("time.byPerson")}</div>
            <div className="space-y-1">
              {loggedByUser.map((row) => (
                <div key={row.userId} className="flex items-center gap-2 text-[13px]">
                  {names[row.userId]?.user ? <Avatar user={names[row.userId].user} size="sm" /> : null}
                  <span className="text-cu-text-secondary">{names[row.userId]?.name ?? row.userId}</span>
                  <span className="ml-auto tabular-nums text-cu-text">{formatDuration(row.seconds)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DayEditor
          defaultSeconds={ownDayFromEntries(entries, currentUserId, todayWorkDate())}
          onSave={(durationSeconds, workDate) => log.mutate({ durationSeconds, workDate })}
        />

        {ownByDate.length > 0 && (
          <div className="mt-2 divide-y divide-cu-border/60 border-t border-cu-border/60">
            {ownByDate.map(([date, entry]) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                date={date}
                mine
                onClear={() => log.mutate({ durationSeconds: 0, workDate: date })}
              />
            ))}
          </div>
        )}

        {othersByDate.length > 0 && (
          <div className="mt-2 divide-y divide-cu-border/60 border-t border-cu-border/60">
            {othersByDate.flatMap(([date, rows]) =>
              rows.map((entry) => (
                <EntryRow key={entry.id} entry={entry} date={date} />
              )),
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function ownDayFromEntries(entries: TimeEntry[], userId: string, workDate: string): number {
  return loggedSeconds(entries.filter((e) => e.userId === userId && formatWorkDate(e.workDate) === workDate));
}

function liveSeconds(startedAt: string | Date): number {
  return Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
}

function LiveTotal({ entries, fallback }: { entries: TimeEntry[]; fallback: number }) {
  const hasRunning = entries.some((e) => e.endedAt === null);
  const [, force] = useState(0);
  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [hasRunning]);
  const total = loggedSeconds(entries);
  return (
    <span className={`font-semibold tabular-nums ${hasRunning ? "text-cu-purple" : "text-cu-text"}`}>
      {hasRunning ? formatClock(total) : formatDuration(fallback)}
    </span>
  );
}

function EstimateEditor({ minutes, onSave }: { minutes: number | null; onSave: (m: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState("");
  const t = useT();
  if (editing) {
    return (
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const parsed = parseEstimateMinutes(v);
          onSave(parsed === null ? (v.trim() === "" ? null : minutes) : parsed);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder={t("time.estimateHint")}
        className="w-20 rounded border border-cu-border bg-cu-bg px-1 py-0.5 text-[13px] outline-none focus:border-cu-purple"
      />
    );
  }
  return (
    <button
      onClick={() => {
        setV(minutes ? formatEstimate(minutes) : "");
        setEditing(true);
      }}
      className="group flex items-center gap-1 font-semibold text-cu-text hover:text-cu-purple"
    >
      {minutes ? formatEstimate(minutes) : <span className="text-cu-text-tertiary">{t("common.set")}</span>}
      <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function DayEditor({
  defaultSeconds,
  onSave,
}: {
  defaultSeconds: number;
  onSave: (seconds: number, workDate: string) => void;
}) {
  const t = useT();
  const [workDate, setWorkDate] = useState(todayWorkDate());
  const [v, setV] = useState(defaultSeconds ? String(Math.round((defaultSeconds / 3600) * 100) / 100) : "");
  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        type="date"
        value={workDate}
        onChange={(e) => setWorkDate(e.target.value)}
        className="rounded border border-cu-border bg-cu-bg px-2 py-1 text-[13px] outline-none focus:border-cu-purple"
      />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={t("time.estimateHint")}
        className="w-24 rounded border border-cu-border bg-cu-bg px-2 py-1 text-[13px] outline-none focus:border-cu-purple"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const parsed = v.trim() === "" ? 0 : parseLoggedSeconds(v);
            if (parsed !== null) onSave(parsed, workDate);
          }
        }}
      />
      <button
        onClick={() => {
          const parsed = v.trim() === "" ? 0 : parseLoggedSeconds(v);
          if (parsed !== null) onSave(parsed, workDate);
        }}
        className="rounded bg-cu-purple px-2.5 py-1 text-[13px] font-medium text-white hover:bg-cu-purple-dark"
      >
        {t("time.setDay")}
      </button>
    </div>
  );
}

function EntryRow({
  entry,
  date,
  mine,
  onClear,
}: {
  entry: TimeEntry;
  date: string;
  mine?: boolean;
  onClear?: () => void;
}) {
  const isRunning = entry.endedAt === null;
  const t = useT();
  return (
    <div className="group flex items-center gap-2 py-2 text-[13px]">
      <Avatar user={entry.user} size="sm" />
      <span className="text-cu-text-secondary">{entry.user.name}</span>
      <span className="text-[12px] tabular-nums text-cu-text-tertiary">{date}</span>
      {entry.description && (
        <span className="truncate text-cu-text-tertiary">— {entry.description}</span>
      )}
      <span className="ml-auto font-medium tabular-nums">
        {isRunning ? (
          <span className="flex items-center gap-1 text-cu-purple">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cu-purple" /> {t("time.running")}
          </span>
        ) : (
          formatDuration(entry.duration)
        )}
      </span>
      {mine && !isRunning && onClear && (
        <button
          onClick={onClear}
          className="rounded px-1 text-[11px] text-cu-text-tertiary opacity-0 transition-opacity hover:text-cu-urgent group-hover:opacity-100"
        >
          {t("time.clearDay")}
        </button>
      )}
    </div>
  );
}

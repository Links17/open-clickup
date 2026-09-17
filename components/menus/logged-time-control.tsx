"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatDuration,
  ownDaySeconds,
  parseLoggedSeconds,
  todayWorkDate,
  type TimeEntryLite,
} from "@/lib/time";
import { useT } from "@/lib/i18n";

function hoursDraft(seconds: number): string {
  if (seconds <= 0) return "";
  return String(Math.round((seconds / 3600) * 100) / 100);
}

export function LoggedTimeControl({
  totalSeconds,
  entries,
  currentUserId,
  byUserLabel,
  onSet,
  compact = false,
}: {
  totalSeconds: number;
  entries: TimeEntryLite[];
  currentUserId: string;
  byUserLabel?: string;
  onSet: (seconds: number, workDate: string) => void;
  compact?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [workDate, setWorkDate] = useState(todayWorkDate());
  const [v, setV] = useState("");

  const daySeconds = useMemo(
    () => ownDaySeconds(entries, currentUserId, workDate),
    [entries, currentUserId, workDate],
  );

  function openPopover(next: boolean) {
    if (next) {
      const today = todayWorkDate();
      setWorkDate(today);
      setV(hoursDraft(ownDaySeconds(entries, currentUserId, today)));
    }
    setOpen(next);
  }

  function save(seconds: number) {
    onSet(seconds, workDate);
    setOpen(false);
  }

  function commit() {
    const parsed = v.trim() === "" ? 0 : parseLoggedSeconds(v);
    if (parsed === null) return;
    save(parsed);
  }

  const hasLogged = totalSeconds > 0;

  return (
    <Popover.Root open={open} onOpenChange={openPopover}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex min-h-[1.5rem] w-full items-center gap-1 rounded text-left outline-none"
          title={byUserLabel || t("col.logged")}
        >
          {hasLogged ? (
            <span className="text-[13px] tabular-nums text-cu-text">{formatDuration(totalSeconds)}</span>
          ) : (
            <span
              className={cn(
                "flex items-center gap-1 text-[13px] text-cu-text-tertiary hover:text-cu-text-secondary",
                compact && "opacity-40 group-hover:opacity-100 group-hover/row:opacity-100",
              )}
            >
              <Timer className="h-3.5 w-3.5 shrink-0" />
              {compact ? null : t("col.logged")}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="end"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="z-50 w-[240px] rounded-lg border border-cu-border bg-cu-panel p-2.5 shadow-lg"
        >
          <p className="mb-2 text-[12px] font-medium text-cu-text">{t("time.setDay")}</p>
          <label className="mb-1 block text-[11px] text-cu-text-tertiary">{t("time.workDate")}</label>
          <input
            type="date"
            value={workDate}
            onChange={(e) => {
              const next = e.target.value;
              setWorkDate(next);
              setV(hoursDraft(ownDaySeconds(entries, currentUserId, next)));
            }}
            className="mb-2 w-full rounded border border-cu-border bg-cu-bg px-2 py-1 text-[13px] outline-none focus:border-cu-purple"
          />
          <label className="mb-1 block text-[11px] text-cu-text-tertiary">{t("col.logged")}</label>
          <input
            autoFocus
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={t("time.estimateHint")}
            className="mb-2 w-full rounded border border-cu-border bg-cu-bg px-2 py-1 text-[13px] tabular-nums outline-none focus:border-cu-purple"
          />
          {daySeconds > 0 && (
            <p className="mb-2 text-[11px] text-cu-text-tertiary">
              {t("time.logged")}: {formatDuration(daySeconds)}
            </p>
          )}
          {byUserLabel && (
            <pre className="mb-2 max-h-24 overflow-auto whitespace-pre-wrap font-sans text-[11px] text-cu-text-secondary">
              {byUserLabel}
            </pre>
          )}
          <div className="flex justify-end gap-1.5">
            {daySeconds > 0 && (
              <button
                type="button"
                onClick={() => save(0)}
                className="rounded px-2 py-1 text-[12px] text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-urgent"
              >
                {t("time.clearDay")}
              </button>
            )}
            <button
              type="button"
              onClick={commit}
              className="rounded bg-cu-purple px-2.5 py-1 text-[12px] font-medium text-white hover:bg-cu-purple-dark"
            >
              {t("common.save")}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

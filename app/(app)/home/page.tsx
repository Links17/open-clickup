"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  startOfDay,
  isBefore,
  isToday,
  isWithinInterval,
  addDays,
  format,
} from "date-fns";
import { CalendarClock, ChevronDown } from "lucide-react";
import { useMyTasks, useLogTime, type MyTask } from "@/lib/hooks";
import { WeekTimesheet } from "@/components/timesheet/week-strip";
import { byUserTitle, displayLoggedTotal } from "@/lib/time";
import { LoggedTimeControl } from "@/components/menus/logged-time-control";
import { useWorkspace } from "@/components/workspace-context";
import { StatusCircle } from "@/components/menus/status-control";
import { PriorityFlag, TagChip } from "@/components/ui/primitives";
import type { Priority, StatusType } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { useI18n, useT } from "@/lib/i18n";

type BucketKey = "overdue" | "today" | "upcoming" | "later" | "none";

const BUCKET_KEYS: { key: BucketKey; labelKey: string }[] = [
  { key: "overdue", labelKey: "home.overdue" },
  { key: "today", labelKey: "home.today" },
  { key: "upcoming", labelKey: "home.upcoming" },
  { key: "later", labelKey: "home.later" },
  { key: "none", labelKey: "home.noDue" },
];

function greeting(t: (key: string) => string): string {
  const h = new Date().getHours();
  if (h < 12) return t("home.morning");
  if (h < 18) return t("home.afternoon");
  return t("home.evening");
}

export default function HomePage() {
  const { currentUser } = useWorkspace();
  const { data, isLoading } = useMyTasks();
  const { t, dateLocale, locale } = useI18n();

  const { buckets, done } = useMemo(() => {
    const today = startOfDay(new Date());
    const weekEnd = addDays(today, 7);
    const buckets: Record<BucketKey, MyTask[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      later: [],
      none: [],
    };
    const done: MyTask[] = [];
    for (const t of data?.tasks ?? []) {
      if (t.status.type === "DONE" || t.status.type === "CLOSED") {
        done.push(t);
        continue;
      }
      if (!t.dueDate) {
        buckets.none.push(t);
        continue;
      }
      const due = startOfDay(new Date(t.dueDate));
      if (isToday(due)) buckets.today.push(t);
      else if (isBefore(due, today)) buckets.overdue.push(t);
      else if (isWithinInterval(due, { start: today, end: weekEnd })) buckets.upcoming.push(t);
      else buckets.later.push(t);
    }
    return { buckets, done };
  }, [data]);

  const total = data?.tasks.length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-cu-text">
            {greeting(t)}{locale === "zh" ? "，" : ", "}{currentUser.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-[13px] text-cu-text-secondary">
            {format(new Date(), "EEEE, MMMM d", { locale: dateLocale })} ·{" "}
            {total === 0
              ? t("home.nothingAssigned")
              : total === 1
                ? t("home.assignedOne")
                : t("home.assignedMany", { count: total })}
          </p>
        </div>

        <WeekTimesheet />

        {isLoading && <p className="text-[13px] text-cu-text-tertiary">{t("common.loading")}</p>}

        {!isLoading && total === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-cu-border py-16 text-center">
            <CalendarClock className="h-8 w-8 text-cu-text-tertiary" />
            <p className="text-[14px] font-medium text-cu-text">{t("home.allClear")}</p>
            <p className="text-[13px] text-cu-text-tertiary">{t("home.assignedHint")}</p>
          </div>
        )}

        <div className="space-y-5">
          {BUCKET_KEYS.map(({ key, labelKey }) =>
            buckets[key].length > 0 ? (
              <Section key={key} label={t(labelKey)} count={buckets[key].length} accent={key === "overdue"}>
                {buckets[key].map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </Section>
            ) : null,
          )}

          {done.length > 0 && <DoneSection tasks={done} />}
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  count,
  accent,
  children,
}: {
  label: string;
  count: number;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className={cn(
          "mb-1.5 flex items-center gap-2 text-[13px] font-semibold",
          accent ? "text-cu-urgent" : "text-cu-text-secondary",
        )}
      >
        {label}
        <span className="text-cu-text-tertiary">{count}</span>
      </h2>
      <div className="overflow-hidden rounded-lg border border-cu-border">{children}</div>
    </section>
  );
}

function DoneSection({ tasks }: { tasks: MyTask[] }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-cu-text-secondary hover:text-cu-text"
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
        {t("home.completed")}
        <span className="text-cu-text-tertiary">{tasks.length}</span>
      </button>
      {open && (
        <div className="overflow-hidden rounded-lg border border-cu-border">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} muted />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskRow({ task, muted }: { task: MyTask; muted?: boolean }) {
  const router = useRouter();
  const { dateLocale } = useI18n();
  const logTime = useLogTime(task.listId);
  const { currentUser, workspace } = useWorkspace();
  const memberNames = Object.fromEntries(workspace.members.map((m) => [m.user.id, m.user.name]));
  return (
    <div className="flex w-full items-center gap-2.5 border-b border-cu-border px-3 py-2 last:border-0 hover:bg-cu-hover">
      <button
        type="button"
        onClick={() => router.push(`/l/${task.listId}?task=${task.id}`)}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <StatusCircle status={{ color: task.status.color, type: task.status.type as StatusType }} size={15} />
        <span className={cn("min-w-0 flex-1 truncate text-[13px]", muted ? "text-cu-text-tertiary line-through" : "text-cu-text")}>
          {task.name}
        </span>
        {task.module && (
          <TagChip
            name={task.module.name}
            color={task.module.status.color}
            className="max-w-[7rem] shrink-0 truncate"
          />
        )}
      </button>
      <div className="w-[5.5rem] shrink-0">
        <LoggedTimeControl
          totalSeconds={displayLoggedTotal(task)}
          entries={task.timeEntries ?? []}
          currentUserId={currentUser.id}
          byUserLabel={byUserTitle(task.loggedByUser, memberNames)}
          onSet={(durationSeconds, workDate) => logTime.mutate({ taskId: task.id, durationSeconds, workDate })}
        />
      </div>
      {task.priority && <PriorityFlag priority={task.priority as Priority} />}
      {task.dueDate && (
        <span className="w-14 shrink-0 text-right text-[12px] text-cu-text-tertiary">
          {format(new Date(task.dueDate), "MMM d", { locale: dateLocale })}
        </span>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { modulePath, type ModuleRecord } from "@/lib/modules";
import { StatusCircle } from "@/components/menus/status-control";
import { PriorityFlag } from "@/components/ui/primitives";
import type { MyTask } from "@/lib/hooks";
import type { Priority, StatusType } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function ModuleTaskPanel({
  moduleId,
  modules,
  onClose,
}: {
  moduleId: string;
  modules: ModuleRecord[];
  onClose: () => void;
}) {
  const { t, dateLocale } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["module-tasks", moduleId],
    queryFn: () => apiGet<{ tasks: MyTask[] }>(`/api/modules/${moduleId}/tasks`),
  });
  const title = modulePath(modules, moduleId) || t("modules.module");
  const tasks = data?.tasks ?? [];

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-cu-border bg-cu-panel">
      <div className="flex items-start justify-between gap-2 border-b border-cu-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-cu-text">{title}</p>
          <p className="text-[12px] text-cu-text-tertiary">
            {isLoading
              ? t("common.loading")
              : tasks.length === 1
                ? t("modules.tasksOne")
                : t("modules.tasksMany", { count: tasks.length })}
          </p>
        </div>
        <button onClick={onClose} className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-text">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!isLoading && tasks.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-cu-text-tertiary">{t("modules.noTasks")}</p>
        )}
        {tasks.map((task) => (
          <ModuleTaskRow key={task.id} task={task} />
        ))}
      </div>
    </aside>
  );
}

function ModuleTaskRow({ task }: { task: MyTask }) {
  const router = useRouter();
  const { dateLocale } = useI18n();
  const done = task.status.type === "DONE" || task.status.type === "CLOSED";
  return (
    <button
      onClick={() => router.push(`/l/${task.listId}?task=${task.id}`)}
      className="flex w-full items-center gap-2.5 border-b border-cu-border px-3 py-2 text-left last:border-0 hover:bg-cu-hover"
    >
      <StatusCircle status={{ color: task.status.color, type: task.status.type as StatusType }} size={15} />
      <span className={cn("min-w-0 flex-1 truncate text-[13px]", done ? "text-cu-text-tertiary line-through" : "text-cu-text")}>
        {task.name}
      </span>
      {task.priority && <PriorityFlag priority={task.priority as Priority} />}
      <span
        className="shrink-0 rounded px-1.5 py-0.5 text-[11px]"
        style={{ backgroundColor: `${task.list.space.color}22`, color: task.list.space.color }}
      >
        {task.list.name}
      </span>
      {task.dueDate && (
        <span className="w-16 shrink-0 text-right text-[12px] text-cu-text-tertiary">
          {format(new Date(task.dueDate), "MMM d", { locale: dateLocale })}
        </span>
      )}
    </button>
  );
}

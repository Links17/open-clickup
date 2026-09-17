"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import type { ListData, TaskWithRelations, UserLite, WorkspaceTree } from "@/lib/queries";
import { formatWorkDate, ownDaySeconds, todayWorkDate, type TimeEntryLite } from "@/lib/time";
import type { TaskPatch } from "@/lib/tasks";
import type { ModuleStat } from "@/lib/modules";

export type Bootstrap = { currentUser: UserLite; workspace: WorkspaceTree; favorites: string[] };

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => apiSend<{ favorited: boolean }>(`/api/lists/${listId}/favorite`, "POST"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bootstrap"] }),
  });
}

// ----------------------------------------------------------------------------
// Queries
// ----------------------------------------------------------------------------

/** Subscribe to the SSE stream and invalidate caches so collaborators' changes appear live. */
export function useRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: string; listId?: string };
        if (event.type === "list" && event.listId) {
          qc.invalidateQueries({ queryKey: ["list", event.listId] });
          qc.invalidateQueries({ queryKey: ["task"] });
          qc.invalidateQueries({ queryKey: ["my-tasks"] });
          qc.invalidateQueries({ queryKey: ["module-stats"] });
          qc.invalidateQueries({ queryKey: ["module-tasks"] });
          qc.invalidateQueries({ queryKey: ["timesheet"] });
        } else if (event.type === "bootstrap") {
          qc.invalidateQueries({ queryKey: ["bootstrap"] });
          qc.invalidateQueries({ queryKey: ["module-stats"] });
        }
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } catch {
        /* ignore malformed event */
      }
    };
    return () => es.close();
  }, [qc]);
}

export type NotificationItem = {
  id: string;
  type: string;
  body: string;
  read: boolean;
  createdAt: string;
  actor: UserLite | null;
  task: { id: string; name: string; listId: string } | null;
};

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet<{ notifications: NotificationItem[]; unread: number }>("/api/notifications"),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => apiSend("/api/notifications/read", "POST", { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export type MyTask = {
  id: string;
  name: string;
  listId: string;
  priority: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: { name: string; color: string; type: string };
  list: { name: string; space: { name: string; color: string } };
  module: { id: string; name: string; status: { color: string } } | null;
  timeEntries: TimeEntryLite[];
  loggedTotal?: number;
  loggedByUser?: { userId: string; seconds: number }[];
};

export function useMyTasks() {
  return useQuery({
    queryKey: ["my-tasks"],
    queryFn: () => apiGet<{ tasks: MyTask[] }>("/api/me/tasks"),
    placeholderData: keepPreviousData,
  });
}

export function useModuleStats() {
  return useQuery({
    queryKey: ["module-stats"],
    queryFn: () => apiGet<{ stats: Record<string, ModuleStat> }>("/api/modules/stats"),
  });
}

export type TaskTemplate = {
  id: string;
  name: string;
  taskName: string;
  description: string | null;
  priority: string | null;
  checklists: { name: string; items: string[] }[] | null;
};

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => apiGet<TaskTemplate[]>("/api/templates"),
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { fromTaskId: string; name: string }) =>
      apiSend<TaskTemplate>("/api/templates", "POST", v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSend(`/api/templates/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useApplyTemplate(listId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      apiSend<TaskWithRelations>(`/api/lists/${listId}/apply-template`, "POST", { templateId }),
    onSuccess: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

export function useBootstrap() {
  return useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => apiGet<Bootstrap>("/api/bootstrap"),
    staleTime: 5 * 60_000,
  });
}

export function useList(listId: string | undefined) {
  return useQuery({
    queryKey: ["list", listId],
    queryFn: () => apiGet<ListData>(`/api/lists/${listId}`),
    enabled: !!listId,
    // keep the previous list visible while the next one loads (no skeleton flash)
    placeholderData: keepPreviousData,
  });
}

// ----------------------------------------------------------------------------
// Hierarchy CRUD (spaces / folders / lists) — all refresh the sidebar tree
// ----------------------------------------------------------------------------

type ListLite = { id: string; name: string; spaceId: string };

export function useHierarchy() {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useT();
  const refresh = () => qc.invalidateQueries({ queryKey: ["bootstrap"] });

  const createSpace = useMutation({
    mutationFn: (name: string) => apiSend<{ id: string }>("/api/spaces", "POST", { name }),
    onSuccess: refresh,
  });
  const createFolder = useMutation({
    mutationFn: (v: { spaceId: string; name: string }) =>
      apiSend<{ id: string }>("/api/folders", "POST", v),
    onSuccess: refresh,
  });
  const createList = useMutation({
    mutationFn: (v: { spaceId: string; folderId?: string | null; name: string }) =>
      apiSend<ListLite>("/api/lists", "POST", v),
    onSuccess: refresh,
  });
  const rename = useMutation({
    mutationFn: (v: { kind: "spaces" | "folders" | "lists"; id: string; name: string }) =>
      apiSend(`/api/${v.kind}/${v.id}`, "PATCH", { name: v.name }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (v: { kind: "spaces" | "folders" | "lists"; id: string; name: string }) =>
      apiSend(`/api/${v.kind}/${v.id}`, "DELETE"),
    onSuccess: (_d, v) => {
      refresh();
      toast.success(t("toast.deleted", { name: v.name }));
    },
    onError: () => toast.error(t("toast.deleteFailed")),
  });

  return { createSpace, createFolder, createList, rename, remove };
}

export type TagModel = { id: string; spaceId: string; name: string; color: string };

export function useTags(spaceId: string | undefined) {
  return useQuery({
    queryKey: ["tags", spaceId],
    queryFn: () => apiGet<TagModel[]>(`/api/spaces/${spaceId}/tags`),
    enabled: !!spaceId,
  });
}

export function useCreateTag(spaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiSend<TagModel>(`/api/spaces/${spaceId}/tags`, "POST", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags", spaceId] }),
  });
}

// ----------------------------------------------------------------------------
// Mutations (optimistic where it matters for UX feel)
// ----------------------------------------------------------------------------

export function useUpdateTask(listId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, patch }: { taskId: string; patch: TaskPatch }) =>
      apiSend<TaskWithRelations>(`/api/tasks/${taskId}`, "PATCH", patch),
    onMutate: async ({ taskId, patch }) => {
      if (!listId) return;
      await qc.cancelQueries({ queryKey: ["list", listId] });
      const prev = qc.getQueryData<ListData>(["list", listId]);
      if (prev) {
        qc.setQueryData<ListData>(["list", listId], {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === taskId ? applyOptimistic(t, patch) : t,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && listId) qc.setQueryData(["list", listId], ctx.prev);
    },
    onSettled: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });
}

function upsertOwnDayEntry(
  entries: TimeEntryLite[] | undefined,
  userId: string,
  workDate: string,
  durationSeconds: number,
): TimeEntryLite[] {
  const rest = (entries ?? []).filter((e) => {
    const day = e.workDate ? formatWorkDate(e.workDate) : formatWorkDate(e.startedAt);
    return !(e.userId === userId && day === workDate);
  });
  if (durationSeconds <= 0) return rest;
  const stamp = new Date();
  return [
    ...rest,
    { duration: durationSeconds, startedAt: stamp, endedAt: stamp, userId, workDate },
  ];
}

function applyDayLog<T extends { id: string; timeEntries?: TimeEntryLite[]; loggedTotal?: number; subtasks?: { id: string; timeEntries?: TimeEntryLite[]; loggedTotal?: number }[] }>(
  task: T,
  taskId: string,
  userId: string,
  workDate: string,
  durationSeconds: number,
): T {
  if (task.id === taskId) {
    const prev = ownDaySeconds(task.timeEntries ?? [], userId, workDate);
    const delta = durationSeconds - prev;
    return {
      ...task,
      timeEntries: upsertOwnDayEntry(task.timeEntries, userId, workDate, durationSeconds),
      loggedTotal: Math.max(0, (task.loggedTotal ?? 0) + delta),
    };
  }
  if (!task.subtasks) return task;
  const idx = task.subtasks.findIndex((s) => s.id === taskId);
  if (idx < 0) return task;
  const sub = task.subtasks[idx];
  const prev = ownDaySeconds(sub.timeEntries ?? [], userId, workDate);
  const delta = durationSeconds - prev;
  const nextSubs = task.subtasks.slice();
  nextSubs[idx] = {
    ...sub,
    timeEntries: upsertOwnDayEntry(sub.timeEntries, userId, workDate, durationSeconds),
    loggedTotal: Math.max(0, (sub.loggedTotal ?? 0) + delta),
  };
  return {
    ...task,
    subtasks: nextSubs,
    loggedTotal: Math.max(0, (task.loggedTotal ?? 0) + delta),
  };
}

export function useLogTime(listId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      durationSeconds,
      workDate,
    }: {
      taskId: string;
      durationSeconds: number;
      workDate?: string;
    }) =>
      apiSend(`/api/tasks/${taskId}/time`, "POST", {
        action: "log",
        durationSeconds,
        workDate: workDate ?? todayWorkDate(),
      }),
    onMutate: async ({ taskId, durationSeconds, workDate }) => {
      const day = workDate ?? todayWorkDate();
      const userId = qc.getQueryData<Bootstrap>(["bootstrap"])?.currentUser.id;
      await qc.cancelQueries({ queryKey: ["my-tasks"] });
      if (listId) await qc.cancelQueries({ queryKey: ["list", listId] });
      const prevMine = qc.getQueryData<{ tasks: MyTask[] }>(["my-tasks"]);
      const prevList = listId ? qc.getQueryData<ListData>(["list", listId]) : undefined;
      if (userId && prevMine) {
        qc.setQueryData<{ tasks: MyTask[] }>(["my-tasks"], {
          tasks: prevMine.tasks.map((t) => applyDayLog(t, taskId, userId, day, durationSeconds)),
        });
      }
      if (userId && prevList && listId) {
        qc.setQueryData<ListData>(["list", listId], {
          ...prevList,
          tasks: prevList.tasks.map((t) => applyDayLog(t, taskId, userId, day, durationSeconds)),
        });
      }
      return { prevMine, prevList };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prevMine) qc.setQueryData(["my-tasks"], ctx.prevMine);
      if (ctx?.prevList && listId) qc.setQueryData(["list", listId], ctx.prevList);
    },
    onSettled: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      qc.invalidateQueries({ queryKey: ["task"] });
      qc.invalidateQueries({ queryKey: ["module-tasks"] });
      qc.invalidateQueries({ queryKey: ["timesheet"] });
    },
  });
}

export type UserTimesheet = { capMinutes: number; days: { date: string; seconds: number }[] };
export type WorkspaceTimesheet = {
  capMinutes: number;
  members: { userId: string; name: string; color: string; days: Record<string, number> }[];
};

export function useMyTimesheet(from: string, to: string) {
  return useQuery({
    queryKey: ["timesheet", "me", from, to],
    queryFn: () => apiGet<UserTimesheet>(`/api/me/timesheet?from=${from}&to=${to}`),
  });
}

export function useWorkspaceTimesheet(from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: ["timesheet", "workspace", from, to],
    queryFn: () => apiGet<WorkspaceTimesheet>(`/api/workspace/timesheet?from=${from}&to=${to}`),
    enabled,
  });
}

export function useUpdateDailyCap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hours: number) =>
      apiSend("/api/workspace", "PATCH", { dailyHourCapMinutes: Math.round(hours * 60) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
      qc.invalidateQueries({ queryKey: ["timesheet"] });
    },
  });
}

export function useCreateTask(listId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      listId: string;
      name: string;
      statusId?: string;
      parentId?: string | null;
      priority?: string | null;
      assigneeIds?: string[];
    }) => apiSend<TaskWithRelations>("/api/tasks", "POST", input),
    onSettled: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

export function useDuplicateTask(listId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      apiSend<TaskWithRelations>(`/api/tasks/${taskId}/duplicate`, "POST"),
    onSettled: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

export function useBulk(listId: string | undefined) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useT();
  return useMutation({
    mutationFn: (input: {
      ids: string[];
      patch?: { statusId?: string; priority?: string | null; assigneeIds?: string[] };
      delete?: boolean;
    }) => apiSend("/api/tasks/bulk", "POST", input),
    onSuccess: (_d, input) => {
      if (input.delete) toast.success(t("toast.deletedCount", { count: input.ids.length }));
    },
    onError: (_e, input) => {
      if (input.delete) toast.error(t("toast.deleteFailed"));
    },
    onSettled: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

export function useSetFieldValue(listId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { taskId: string; fieldId: string; value: unknown }) =>
      apiSend(`/api/tasks/${v.taskId}/fields/${v.fieldId}`, "PUT", { value: v.value }),
    onSettled: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

export function useDeleteTask(listId: string | undefined) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useT();
  return useMutation({
    mutationFn: (taskId: string) =>
      apiSend<{ ok: true }>(`/api/tasks/${taskId}`, "DELETE"),
    onMutate: async (taskId) => {
      if (!listId) return;
      await qc.cancelQueries({ queryKey: ["list", listId] });
      const prev = qc.getQueryData<ListData>(["list", listId]);
      const name = prev ? taskNameFromList(prev, taskId) : undefined;
      if (prev) {
        qc.setQueryData<ListData>(["list", listId], {
          ...prev,
          tasks: prev.tasks.filter((row) => row.id !== taskId),
        });
      }
      return { prev, name };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && listId) qc.setQueryData(["list", listId], ctx.prev);
      toast.error(t("toast.deleteFailed"));
    },
    onSuccess: (_d, _v, ctx) => {
      toast.success(ctx?.name ? t("toast.deleted", { name: ctx.name }) : t("toast.deletedGeneric"));
    },
    onSettled: () => {
      if (listId) qc.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
}

function taskNameFromList(data: ListData, taskId: string): string | undefined {
  for (const row of data.tasks) {
    if (row.id === taskId) return row.name;
    const sub = row.subtasks?.find((s) => s.id === taskId);
    if (sub) return sub.name;
  }
}

function applyOptimistic(task: TaskWithRelations, patch: TaskPatch): TaskWithRelations {
  return {
    ...task,
    name: patch.name ?? task.name,
    description: patch.description !== undefined ? patch.description : task.description,
    priority: patch.priority !== undefined ? (patch.priority as TaskWithRelations["priority"]) : task.priority,
    statusId: patch.statusId ?? task.statusId,
    position: patch.position ?? task.position,
    startDate: patch.startDate !== undefined ? (patch.startDate ? new Date(patch.startDate) : null) : task.startDate,
    dueDate: patch.dueDate !== undefined ? (patch.dueDate ? new Date(patch.dueDate) : null) : task.dueDate,
    timeEstimate: patch.timeEstimate !== undefined ? patch.timeEstimate : task.timeEstimate,
    moduleId: patch.moduleId !== undefined ? patch.moduleId : task.moduleId,
  };
}

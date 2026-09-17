import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { attachLoggedRollup, descendantTaskIds, listTimeGraph, rollupForTaskIds } from "@/lib/timesheet";
import { rollupLoggedByUser, rollupLoggedSeconds } from "@/lib/time";

// ----------------------------------------------------------------------------
// Reusable include shapes (single source of truth for API <-> client types)
// ----------------------------------------------------------------------------

export const userSelect = {
  id: true,
  name: true,
  email: true,
  color: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

export const taskInclude = {
  status: true,
  assignees: { include: { user: { select: userSelect } } },
  tags: { include: { tag: true } },
  customFieldValues: true,
  module: { select: { id: true, name: true, status: { select: { color: true } } } },
  subtasks: {
    where: { archived: false },
    orderBy: { position: "asc" },
    include: {
      status: true,
      assignees: { include: { user: { select: userSelect } } },
      timeEntries: { select: { duration: true, startedAt: true, endedAt: true, userId: true, workDate: true } },
    },
  },
  timeEntries: { select: { duration: true, startedAt: true, endedAt: true, userId: true, workDate: true } },
  _count: { select: { comments: true, subtasks: true, checklists: true } },
} satisfies Prisma.TaskInclude;

export const myTaskSelect = {
  id: true,
  name: true,
  listId: true,
  priority: true,
  startDate: true,
  dueDate: true,
  status: { select: { name: true, color: true, type: true } },
  list: { select: { name: true, space: { select: { name: true, color: true } } } },
  module: { select: { id: true, name: true, status: { select: { color: true } } } },
  timeEntries: { select: { duration: true, startedAt: true, endedAt: true, userId: true, workDate: true } },
} satisfies Prisma.TaskSelect;

export type LoggedByUser = { userId: string; seconds: number };
type TaskBase = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;
export type SubtaskWithRelations = TaskBase["subtasks"][number] & {
  loggedTotal?: number;
  loggedByUser?: LoggedByUser[];
};
export type TaskWithRelations = Omit<TaskBase, "subtasks"> & {
  loggedTotal?: number;
  loggedByUser?: LoggedByUser[];
  subtasks: SubtaskWithRelations[];
};
export type UserLite = Prisma.UserGetPayload<{ select: typeof userSelect }>;

// ----------------------------------------------------------------------------
// Workspace tree (for sidebar)
// ----------------------------------------------------------------------------

export async function getWorkspaceTree() {
  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      members: { include: { user: { select: userSelect } } },
      modules: { orderBy: [{ position: "asc" }, { name: "asc" }] },
      moduleStatuses: { orderBy: [{ position: "asc" }, { name: "asc" }] },
      spaces: {
        orderBy: { position: "asc" },
        include: {
          folders: {
            orderBy: { position: "asc" },
            include: {
              lists: {
                orderBy: { position: "asc" },
                include: { _count: { select: { tasks: true } } },
              },
            },
          },
          lists: {
            where: { folderId: null },
            orderBy: { position: "asc" },
            include: { _count: { select: { tasks: true } } },
          },
        },
      },
    },
  });
  return workspace;
}

export type WorkspaceTree = NonNullable<Awaited<ReturnType<typeof getWorkspaceTree>>>;
export type SpaceNode = WorkspaceTree["spaces"][number];
export type FolderNode = SpaceNode["folders"][number];
export type ListNode = SpaceNode["lists"][number];

// ----------------------------------------------------------------------------
// List detail (statuses, custom fields, views, tasks)
// ----------------------------------------------------------------------------

export async function getListData(listId: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      space: { select: { id: true, name: true, color: true, icon: true } },
      folder: { select: { id: true, name: true } },
      statuses: { orderBy: { position: "asc" } },
      customFields: {
        orderBy: { position: "asc" },
        include: { options: { orderBy: { position: "asc" } } },
      },
      views: { orderBy: { position: "asc" } },
    },
  });
  if (!list) return null;

  const rawTasks = await prisma.task.findMany({
    where: { listId, parentId: null, archived: false },
    orderBy: { position: "asc" },
    include: taskInclude,
  });
  const graph = await listTimeGraph(listId);
  const tasks = attachLoggedRollup(
    rawTasks,
    rollupLoggedSeconds(graph.nodes, graph.entries),
    rollupLoggedByUser(graph.nodes, graph.entries),
  );

  // dependency edges between visible tasks (for Gantt arrows)
  const taskIds = tasks.map((t) => t.id);
  const dependencies = taskIds.length
    ? await prisma.taskDependency.findMany({
        where: { blockerId: { in: taskIds }, blockedId: { in: taskIds } },
        select: { id: true, blockerId: true, blockedId: true },
      })
    : [];

  return { list, tasks: tasks as TaskWithRelations[], dependencies };
}

export type ListData = NonNullable<Awaited<ReturnType<typeof getListData>>>;
export type ListWithMeta = ListData["list"];
export type StatusModel = ListWithMeta["statuses"][number];
export type CustomFieldWithOptions = ListWithMeta["customFields"][number];

// ----------------------------------------------------------------------------
// Task detail (full, for the task modal)
// ----------------------------------------------------------------------------

export async function getTaskDetail(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      ...taskInclude,
      parent: { select: { id: true, name: true } },
      createdBy: { select: userSelect },
      watchers: { include: { user: { select: userSelect } } },
      attachments: { orderBy: { createdAt: "desc" } },
      timeEntries: {
        orderBy: [{ workDate: "desc" }, { startedAt: "desc" }],
        include: { user: { select: userSelect } },
      },
      blockedBy: {
        include: {
          blocker: {
            select: { id: true, name: true, listId: true, status: { select: { name: true, color: true, type: true } } },
          },
        },
      },
      blocking: {
        include: {
          blocked: {
            select: { id: true, name: true, listId: true, status: { select: { name: true, color: true, type: true } } },
          },
        },
      },
      checklists: {
        orderBy: { position: "asc" },
        include: { items: { orderBy: { position: "asc" } } },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: userSelect },
          reactions: true,
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: userSelect } },
      },
      list: {
        select: {
          id: true,
          name: true,
          spaceId: true,
          statuses: { orderBy: { position: "asc" } },
          customFields: {
            orderBy: { position: "asc" },
            include: { options: { orderBy: { position: "asc" } } },
          },
        },
      },
    },
  });
  if (!task) return null;
  const ids = await descendantTaskIds([task.id]);
  const subtreeEntries = await prisma.timeEntry.findMany({
    where: { taskId: { in: ids } },
    orderBy: [{ workDate: "desc" }, { startedAt: "desc" }],
    include: { user: { select: userSelect } },
  });
  const rollup = await rollupForTaskIds([task.id]);
  return {
    ...task,
    subtreeEntries,
    loggedTotal: rollup.totals[task.id] ?? 0,
    loggedByUser: Object.entries(rollup.byUser[task.id] ?? {})
      .filter(([, seconds]) => seconds > 0)
      .map(([userId, seconds]) => ({ userId, seconds }))
      .sort((a, b) => b.seconds - a.seconds),
  };
}

export type TaskDetail = NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>;

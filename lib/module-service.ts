import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { myTaskSelect } from "@/lib/queries";
import { attachLoggedRollup, rollupForTaskIds } from "@/lib/timesheet";
import { wouldCreateCycle, buildModuleTree, flattenModuleTree, rollupModuleStats, subtreeIds } from "@/lib/modules";
import { defaultModuleStatusId } from "@/lib/module-status-service";
import { publish } from "@/lib/events";

export async function listModules(workspaceId: string) {
  return prisma.featureModule.findMany({
    where: { workspaceId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
}

export async function createModule(input: {
  workspaceId: string;
  name: string;
  parentId?: string | null;
}) {
  const parentId = input.parentId ?? null;
  if (parentId) {
    const parent = await prisma.featureModule.findUnique({ where: { id: parentId } });
    if (!parent || parent.workspaceId !== input.workspaceId) {
      throw new ApiError(400, "Parent module not found in this workspace.");
    }
  }
  const last = await prisma.featureModule.findFirst({
    where: { workspaceId: input.workspaceId, parentId },
    orderBy: { position: "desc" },
  });
  const created = await prisma.featureModule.create({
    data: {
      workspaceId: input.workspaceId,
      parentId,
      statusId: await defaultModuleStatusId(input.workspaceId),
      name: input.name,
      position: (last?.position ?? 0) + 1000,
    },
  });
  publish({ type: "bootstrap" });
  return created;
}

export async function updateModule(
  moduleId: string,
  workspaceId: string,
  patch: { name?: string; parentId?: string | null; position?: number; statusId?: string },
) {
  const existing = await prisma.featureModule.findUnique({ where: { id: moduleId } });
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new ApiError(404, "Module not found");
  }

  const data: { name?: string; parentId?: string | null; position?: number; statusId?: string } = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.position !== undefined) data.position = patch.position;

  if (patch.statusId !== undefined) {
    const status = await prisma.workspaceModuleStatus.findUnique({ where: { id: patch.statusId } });
    if (!status || status.workspaceId !== workspaceId) {
      throw new ApiError(400, "Status not found in this workspace.");
    }
    data.statusId = patch.statusId;
  }

  if (patch.parentId !== undefined) {
    const parentId = patch.parentId;
    if (parentId) {
      const parent = await prisma.featureModule.findUnique({ where: { id: parentId } });
      if (!parent || parent.workspaceId !== workspaceId) {
        throw new ApiError(400, "Parent module not found in this workspace.");
      }
    }
    const siblings = await prisma.featureModule.findMany({
      where: { workspaceId },
      select: { id: true, parentId: true },
    });
    if (wouldCreateCycle(siblings, moduleId, parentId)) {
      throw new ApiError(400, "Cannot move a module under itself.");
    }
    data.parentId = parentId;
  }

  const updated = await prisma.featureModule.update({ where: { id: moduleId }, data });
  publish({ type: "bootstrap" });
  return updated;
}

export async function deleteModule(moduleId: string, workspaceId: string) {
  const existing = await prisma.featureModule.findUnique({ where: { id: moduleId } });
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new ApiError(404, "Module not found");
  }
  await prisma.featureModule.delete({ where: { id: moduleId } });
  publish({ type: "bootstrap" });
  return { ok: true };
}

export async function moduleStats(workspaceId: string) {
  const modules = await prisma.featureModule.findMany({
    where: { workspaceId },
    select: { id: true, parentId: true, name: true, position: true },
  });
  const tasks = await prisma.task.findMany({
    where: { archived: false, moduleId: { not: null }, module: { workspaceId } },
    select: { moduleId: true, status: { select: { type: true } } },
  });
  return rollupModuleStats(
    modules,
    tasks.map((t) => ({ moduleId: t.moduleId, statusType: t.status.type })),
  );
}

export async function listModuleTasks(moduleId: string, workspaceId: string) {
  const existing = await prisma.featureModule.findUnique({ where: { id: moduleId } });
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new ApiError(404, "Module not found");
  }
  const modules = await listModules(workspaceId);
  const node = flattenModuleTree(buildModuleTree(modules)).find((n) => n.id === moduleId);
  if (!node) throw new ApiError(404, "Module not found");
  const ids = subtreeIds(node);
  const tasks = await prisma.task.findMany({
    where: { archived: false, moduleId: { in: ids } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    select: myTaskSelect,
  });
  const rollup = await rollupForTaskIds(tasks.map((t) => t.id));
  return attachLoggedRollup(tasks, rollup.totals, rollup.byUser);
}

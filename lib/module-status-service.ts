import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { StatusType } from "@/lib/generated/prisma/client";
import { DEFAULT_MODULE_STATUSES } from "@/lib/modules";
import { publish } from "@/lib/events";

export async function ensureModuleStatuses(workspaceId: string) {
  const existing = await prisma.workspaceModuleStatus.findMany({
    where: { workspaceId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  if (existing.length > 0) return existing;
  await prisma.workspaceModuleStatus.createMany({
    data: DEFAULT_MODULE_STATUSES.map((s, i) => ({
      workspaceId,
      name: s.name,
      color: s.color,
      type: s.type as StatusType,
      position: i,
    })),
  });
  return prisma.workspaceModuleStatus.findMany({
    where: { workspaceId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
}

export async function defaultModuleStatusId(workspaceId: string) {
  const statuses = await ensureModuleStatuses(workspaceId);
  const first = statuses[0];
  if (!first) throw new ApiError(500, "Workspace has no module statuses.");
  return first.id;
}

export async function createModuleStatus(input: {
  workspaceId: string;
  name: string;
  color?: string;
  type?: StatusType;
}) {
  await ensureModuleStatuses(input.workspaceId);
  const last = await prisma.workspaceModuleStatus.findFirst({
    where: { workspaceId: input.workspaceId },
    orderBy: { position: "desc" },
  });
  const created = await prisma.workspaceModuleStatus.create({
    data: {
      workspaceId: input.workspaceId,
      name: input.name,
      color: input.color ?? "#87909e",
      type: input.type ?? StatusType.NOT_STARTED,
      position: (last?.position ?? -1) + 1,
    },
  });
  publish({ type: "bootstrap" });
  return created;
}

export async function updateModuleStatus(
  statusId: string,
  workspaceId: string,
  patch: { name?: string; color?: string; type?: StatusType },
) {
  const existing = await prisma.workspaceModuleStatus.findUnique({ where: { id: statusId } });
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new ApiError(404, "Module status not found");
  }
  const data: { name?: string; color?: string; type?: StatusType } = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.color !== undefined) data.color = patch.color;
  if (patch.type !== undefined) data.type = patch.type;
  const updated = await prisma.workspaceModuleStatus.update({
    where: { id: statusId },
    data,
  });
  publish({ type: "bootstrap" });
  return updated;
}

export async function reorderModuleStatuses(workspaceId: string, ids: string[]) {
  const existing = await prisma.workspaceModuleStatus.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const allowed = new Set(existing.map((s) => s.id));
  if (ids.some((id) => !allowed.has(id))) {
    throw new ApiError(400, "Status does not belong to this workspace.");
  }
  await prisma.$transaction(ids.map((id, i) => prisma.workspaceModuleStatus.update({ where: { id }, data: { position: i } })));
  publish({ type: "bootstrap" });
  return { ok: true };
}

export async function deleteModuleStatus(statusId: string, workspaceId: string) {
  const existing = await prisma.workspaceModuleStatus.findUnique({ where: { id: statusId } });
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new ApiError(404, "Module status not found");
  }
  const siblings = await prisma.workspaceModuleStatus.findMany({
    where: { workspaceId, id: { not: statusId } },
    orderBy: { position: "asc" },
  });
  if (siblings.length === 0) {
    throw new ApiError(400, "Cannot delete the only status");
  }
  const fallback = siblings[0];
  await prisma.featureModule.updateMany({ where: { statusId }, data: { statusId: fallback.id } });
  await prisma.workspaceModuleStatus.delete({ where: { id: statusId } });
  publish({ type: "bootstrap" });
  return { ok: true, movedTo: fallback.id };
}

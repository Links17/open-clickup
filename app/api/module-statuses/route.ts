import { NextResponse } from "next/server";
import { z } from "zod";
import { StatusType } from "@/lib/generated/prisma/client";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";
import {
  ensureModuleStatuses,
  createModuleStatus,
  reorderModuleStatuses,
} from "@/lib/module-status-service";

const createSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(80),
  color: z.string().optional(),
  type: z.enum(["NOT_STARTED", "ACTIVE", "DONE", "CLOSED"]).optional(),
});

const reorderSchema = z.object({ ids: z.array(z.string()).min(1) });

export const GET = route(async () => {
  const { workspaceId } = await requireRole("MEMBER");
  const statuses = await ensureModuleStatuses(workspaceId);
  return NextResponse.json(statuses);
});

export const POST = route(async (req) => {
  const { workspaceId } = await requireRole("MEMBER");
  const { name, color, type } = await readJson(req, createSchema);
  const created = await createModuleStatus({
    workspaceId,
    name,
    color,
    type: type as StatusType | undefined,
  });
  return NextResponse.json(created, { status: 201 });
});

export const PUT = route(async (req) => {
  const { workspaceId } = await requireRole("MEMBER");
  const { ids } = await readJson(req, reorderSchema);
  await reorderModuleStatuses(workspaceId, ids);
  return NextResponse.json({ ok: true });
});

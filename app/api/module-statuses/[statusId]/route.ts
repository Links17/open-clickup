import { NextResponse } from "next/server";
import { z } from "zod";
import { StatusType } from "@/lib/generated/prisma/client";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";
import { updateModuleStatus, deleteModuleStatus } from "@/lib/module-status-service";

type Ctx = { params: Promise<{ statusId: string }> };

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  color: z.string().optional(),
  type: z.enum(["NOT_STARTED", "ACTIVE", "DONE", "CLOSED"]).optional(),
});

export const PATCH = route(async (req, { params }: Ctx) => {
  const { statusId } = await params;
  const { workspaceId } = await requireRole("MEMBER");
  const body = await readJson(req, schema);
  const updated = await updateModuleStatus(statusId, workspaceId, {
    ...body,
    type: body.type as StatusType | undefined,
  });
  return NextResponse.json(updated);
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { statusId } = await params;
  const { workspaceId } = await requireRole("MEMBER");
  const result = await deleteModuleStatus(statusId, workspaceId);
  return NextResponse.json(result);
});

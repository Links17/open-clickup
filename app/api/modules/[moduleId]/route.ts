import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";
import { deleteModule, updateModule } from "@/lib/module-service";

type Ctx = { params: Promise<{ moduleId: string }> };

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  parentId: z.string().nullish(),
  position: z.number().optional(),
  statusId: z.string().optional(),
});

export const PATCH = route(async (req, { params }: Ctx) => {
  const { moduleId } = await params;
  const { workspaceId } = await requireRole("MEMBER");
  const patch = await readJson(req, schema);
  const updated = await updateModule(moduleId, workspaceId, patch);
  return NextResponse.json(updated);
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { moduleId } = await params;
  const { workspaceId } = await requireRole("MEMBER");
  await deleteModule(moduleId, workspaceId);
  return NextResponse.json({ ok: true });
});

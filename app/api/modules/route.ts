import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";
import { createModule, listModules } from "@/lib/module-service";

const schema = z.object({
  name: z.string().trim().min(1, "name is required").max(80),
  parentId: z.string().nullish(),
});

export const GET = route(async () => {
  const { workspaceId } = await requireRole("MEMBER");
  const modules = await listModules(workspaceId);
  return NextResponse.json(modules);
});

export const POST = route(async (req) => {
  const { workspaceId } = await requireRole("MEMBER");
  const { name, parentId } = await readJson(req, schema);
  const created = await createModule({ workspaceId, name, parentId: parentId ?? null });
  return NextResponse.json(created, { status: 201 });
});

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { route } from "@/lib/api-helpers";
import { listModuleTasks } from "@/lib/module-service";

type Ctx = { params: Promise<{ moduleId: string }> };

export const GET = route(async (_req, { params }: Ctx) => {
  const { moduleId } = await params;
  const { workspaceId } = await requireRole("MEMBER");
  const tasks = await listModuleTasks(moduleId, workspaceId);
  return NextResponse.json({ tasks });
});

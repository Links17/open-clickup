import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { route } from "@/lib/api-helpers";
import { moduleStats } from "@/lib/module-service";

export const GET = route(async () => {
  const { workspaceId } = await requireRole("MEMBER");
  const stats = await moduleStats(workspaceId);
  return NextResponse.json({ stats });
});

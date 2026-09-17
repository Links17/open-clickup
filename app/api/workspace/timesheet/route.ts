import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { ApiError, route } from "@/lib/api-helpers";
import { getWorkspaceTimesheet } from "@/lib/timesheet";

export const GET = route(async (req) => {
  const { workspaceId } = await requireRole("ADMIN");
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new ApiError(400, "from and to (YYYY-MM-DD) are required");
  }
  const sheet = await getWorkspaceTimesheet(workspaceId, from, to);
  return NextResponse.json(sheet);
});

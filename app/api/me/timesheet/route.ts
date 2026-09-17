import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, route } from "@/lib/api-helpers";
import { getUserTimesheet } from "@/lib/timesheet";

function range(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new ApiError(400, "from and to (YYYY-MM-DD) are required");
  }
  return { from, to };
}

export const GET = route(async (req) => {
  const user = await requireUser();
  const { from, to } = range(req);
  const sheet = await getUserTimesheet(user.id, from, to);
  return NextResponse.json(sheet);
});

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

const patchSchema = z.object({
  dailyHourCapMinutes: z.number().int().min(60).max(24 * 60),
});

export const PATCH = route(async (req) => {
  const { workspaceId } = await requireRole("ADMIN");
  const { dailyHourCapMinutes } = await readJson(req, patchSchema);
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { dailyHourCapMinutes },
  });
  publish({ type: "bootstrap" });
  return NextResponse.json({
    id: workspace.id,
    dailyHourCapMinutes: workspace.dailyHourCapMinutes,
  });
});

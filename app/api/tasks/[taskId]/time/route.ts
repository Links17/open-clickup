import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, readJson, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";
import { todayWorkDate } from "@/lib/time";
import { startTimer, stopTimer, upsertDayLog } from "@/lib/timesheet";

type Ctx = { params: Promise<{ taskId: string }> };

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("stop") }),
  z.object({
    action: z.literal("log"),
    durationSeconds: z.number().int().min(0),
    workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    userId: z.string().optional(),
    description: z.string().trim().max(500).optional(),
  }),
]);

export const POST = route(async (req, { params }: Ctx) => {
  const { taskId } = await params;
  const user = await requireUser();
  const input = await readJson(req, schema);

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { listId: true } });
  if (!task) throw new ApiError(404, "Task not found");

  if (input.action === "start") {
    const entry = await startTimer(taskId, user.id);
    publish({ type: "list", listId: task.listId });
    return NextResponse.json(entry, { status: 201 });
  }

  if (input.action === "stop") {
    const entry = await stopTimer(taskId, user.id);
    publish({ type: "list", listId: task.listId });
    return NextResponse.json(entry);
  }

  if (input.userId && input.userId !== user.id) {
    throw new ApiError(403, "You can only log your own hours.");
  }

  const entry = await upsertDayLog({
    taskId,
    userId: user.id,
    workDate: input.workDate ?? todayWorkDate(),
    durationSeconds: input.durationSeconds,
    description: input.description,
  });
  publish({ type: "list", listId: task.listId });
  if (!entry) return NextResponse.json({ ok: true, deleted: true });
  return NextResponse.json(entry, { status: 201 });
});

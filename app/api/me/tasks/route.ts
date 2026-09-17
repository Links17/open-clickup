import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/api-helpers";
import { myTaskSelect } from "@/lib/queries";
import { attachLoggedRollup, rollupForTaskIds } from "@/lib/timesheet";

// Tasks assigned to the current user, across every list ("My Work" / Home).
export const GET = route(async () => {
  const user = await requireUser();
  const tasks = await prisma.task.findMany({
    where: { archived: false, assignees: { some: { userId: user.id } } },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    select: myTaskSelect,
  });
  const rollup = await rollupForTaskIds(tasks.map((t) => t.id));
  return NextResponse.json({ tasks: attachLoggedRollup(tasks, rollup.totals, rollup.byUser) });
});

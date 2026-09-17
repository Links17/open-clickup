import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createTask, updateTask } from "@/lib/tasks";
import { createModule, updateModule, deleteModule, listModules, moduleStats, listModuleTasks } from "@/lib/module-service";
import {
  ensureModuleStatuses,
  createModuleStatus,
  deleteModuleStatus,
  updateModuleStatus,
} from "@/lib/module-status-service";
import { ApiError } from "@/lib/api-helpers";

let userId: string;
let workspaceId: string;
let listId: string;
let statusId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `mod-${Date.now()}@example.com`, name: "Module Tester" },
  });
  userId = user.id;
  const workspace = await prisma.workspace.create({ data: { name: "Module WS" } });
  workspaceId = workspace.id;
  await prisma.workspaceMember.create({
    data: { workspaceId, userId, role: "OWNER" },
  });
  const space = await prisma.space.create({ data: { workspaceId, name: "Space" } });
  const list = await prisma.list.create({ data: { spaceId: space.id, name: "List" } });
  listId = list.id;
  const status = await prisma.status.create({
    data: { listId, name: "To Do", type: "NOT_STARTED", position: 0 },
  });
  statusId = status.id;
  void statusId;
});

afterAll(async () => {
  await prisma.featureModule.deleteMany({ where: { workspaceId } }).catch(() => {});
  await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
});

describe("feature modules", () => {
  it("creates a workspace tree and attaches a task", async () => {
    const product = await createModule({ workspaceId, name: "Product" });
    const auth = await createModule({ workspaceId, name: "Auth", parentId: product.id });
    const listed = await listModules(workspaceId);
    expect(listed.map((m) => m.name).sort()).toEqual(["Auth", "Product"]);
    expect(listed.find((m) => m.id === auth.id)?.parentId).toBe(product.id);

    const task = await createTask({ listId, name: "Login", createdById: userId });
    const patched = await updateTask(task.id, { moduleId: auth.id }, userId);
    expect(patched.moduleId).toBe(auth.id);
    expect(patched.module?.name).toBe("Auth");
  });

  it("rejects moving a module under its descendant", async () => {
    const root = await createModule({ workspaceId, name: "Root" });
    const child = await createModule({ workspaceId, name: "Child", parentId: root.id });
    await expect(updateModule(root.id, workspaceId, { parentId: child.id })).rejects.toBeInstanceOf(ApiError);
  });

  it("detaches tasks when a module is deleted", async () => {
    const mod = await createModule({ workspaceId, name: "Temp" });
    const task = await createTask({ listId, name: "Orphan me", createdById: userId });
    await updateTask(task.id, { moduleId: mod.id }, userId);
    await deleteModule(mod.id, workspaceId);
    const reloaded = await prisma.task.findUnique({ where: { id: task.id } });
    expect(reloaded?.moduleId).toBeNull();
  });

  it("rolls descendant tasks into parent stats and task lists", async () => {
    const product = await createModule({ workspaceId, name: "Rollup Product" });
    const layer = await createModule({ workspaceId, name: "Client", parentId: product.id });
    const win = await createModule({ workspaceId, name: "Win", parentId: layer.id });
    const bdd = await createModule({ workspaceId, name: "BDD", parentId: win.id });
    const open = await createTask({ listId, name: "Open leaf", createdById: userId });
    await updateTask(open.id, { moduleId: bdd.id }, userId);
    const doneStatus = await prisma.status.create({
      data: { listId, name: "Done", type: "DONE", position: 1 },
    });
    const done = await createTask({ listId, name: "Done leaf", statusId: doneStatus.id, createdById: userId });
    await updateTask(done.id, { moduleId: bdd.id }, userId);
    const archived = await createTask({ listId, name: "Archived", createdById: userId });
    await prisma.task.update({ where: { id: archived.id }, data: { moduleId: bdd.id, archived: true } });

    const stats = await moduleStats(workspaceId);
    expect(stats[win.id]).toEqual({ done: 1, total: 2 });
    expect(stats[product.id]?.total).toBeGreaterThanOrEqual(2);

    const listed = await listModuleTasks(win.id, workspaceId);
    expect(listed.map((t) => t.name).sort()).toEqual(["Done leaf", "Open leaf"]);
  });

  it("seeds default statuses and reassigns on delete", async () => {
    const statuses = await ensureModuleStatuses(workspaceId);
    expect(statuses.map((s) => s.name)).toEqual(["规划", "预研", "进行", "交付", "取消"]);
    const extra = await createModuleStatus({ workspaceId, name: "Hold", color: "#ff7800" });
    const product = await createModule({ workspaceId, name: "Statused" });
    await updateModule(product.id, workspaceId, { statusId: extra.id });
    expect((await prisma.featureModule.findUnique({ where: { id: product.id } }))?.statusId).toBe(extra.id);
    const painted = await updateModuleStatus(extra.id, workspaceId, { color: "#0ab1e8" });
    expect(painted.color).toBe("#0ab1e8");
    await deleteModuleStatus(extra.id, workspaceId);
    const after = await prisma.featureModule.findUnique({ where: { id: product.id } });
    expect(after?.statusId).not.toBe(extra.id);
    await expect(deleteModuleStatus(statuses[0].id, workspaceId)).resolves.toMatchObject({ ok: true });
  });
});

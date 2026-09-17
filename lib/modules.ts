export type ModuleRecord = {
  id: string;
  parentId: string | null;
  name: string;
  position: number;
  statusId?: string;
};

export type ModuleStat = { done: number; total: number };

export type ModuleTaskStatInput = {
  moduleId: string | null;
  statusType: string;
  archived?: boolean;
};

export const DEFAULT_MODULE_STATUSES = [
  { name: "规划", color: "#87909e", type: "NOT_STARTED" as const },
  { name: "预研", color: "#a875ff", type: "ACTIVE" as const },
  { name: "进行", color: "#5b9fff", type: "ACTIVE" as const },
  { name: "交付", color: "#6bc950", type: "DONE" as const },
  { name: "取消", color: "#f50000", type: "CLOSED" as const },
];

export type ModuleTreeNode = ModuleRecord & { children: ModuleTreeNode[] };

/** True if `newParentId` is the node itself or one of its descendants. */
export function wouldCreateCycle(
  modules: { id: string; parentId: string | null }[],
  nodeId: string,
  newParentId: string | null,
): boolean {
  if (!newParentId) return false;
  if (newParentId === nodeId) return true;
  const byId = new Map(modules.map((m) => [m.id, m]));
  const seen = new Set<string>();
  let cur: string | null = newParentId;
  while (cur) {
    if (cur === nodeId) return true;
    if (seen.has(cur)) return true;
    seen.add(cur);
    cur = byId.get(cur)?.parentId ?? null;
  }
  return false;
}

export function buildModuleTree(modules: ModuleRecord[]): ModuleTreeNode[] {
  const sorted = [...modules].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const byParent = new Map<string | null, ModuleRecord[]>();
  for (const m of sorted) {
    const list = byParent.get(m.parentId) ?? [];
    list.push(m);
    byParent.set(m.parentId, list);
  }
  function childrenOf(parentId: string | null): ModuleTreeNode[] {
    return (byParent.get(parentId) ?? []).map((m) => ({ ...m, children: childrenOf(m.id) }));
  }
  return childrenOf(null);
}

export function flattenModuleTree(
  tree: ModuleTreeNode[],
  depth = 0,
): (ModuleTreeNode & { depth: number })[] {
  const out: (ModuleTreeNode & { depth: number })[] = [];
  for (const node of tree) {
    out.push({ ...node, depth });
    out.push(...flattenModuleTree(node.children, depth + 1));
  }
  return out;
}

export type ProductLayer = {
  layer: ModuleTreeNode;
  modules: ModuleTreeNode[];
};

/** Product children are layer titles; each layer's children are module cards. */
export function layersOf(product: ModuleTreeNode): ProductLayer[] {
  return product.children.map((layer) => ({ layer, modules: layer.children }));
}

/** "Product / Layer / Module / Nested" from a flat module list. */
export function modulePath(modules: ModuleRecord[], nodeId: string): string {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const names: string[] = [];
  let cur: ModuleRecord | undefined = byId.get(nodeId);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    names.unshift(cur.name);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return names.join(" / ");
}

export function subtreeIds(node: ModuleTreeNode): string[] {
  return [node.id, ...node.children.flatMap(subtreeIds)];
}

export function rollupModuleStats(
  modules: ModuleRecord[],
  tasks: ModuleTaskStatInput[],
): Record<string, ModuleStat> {
  const direct = new Map<string, ModuleStat>();
  for (const task of tasks) {
    if (task.archived || !task.moduleId) continue;
    const cur = direct.get(task.moduleId) ?? { done: 0, total: 0 };
    cur.total += 1;
    if (task.statusType === "DONE" || task.statusType === "CLOSED") cur.done += 1;
    direct.set(task.moduleId, cur);
  }

  const out: Record<string, ModuleStat> = {};
  function walk(node: ModuleTreeNode): ModuleStat {
    const own = direct.get(node.id) ?? { done: 0, total: 0 };
    let done = own.done;
    let total = own.total;
    for (const child of node.children) {
      const rolled = walk(child);
      done += rolled.done;
      total += rolled.total;
    }
    const stat = { done, total };
    out[node.id] = stat;
    return stat;
  }
  for (const root of buildModuleTree(modules)) walk(root);
  return out;
}

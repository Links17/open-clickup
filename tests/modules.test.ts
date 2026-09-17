import { describe, it, expect } from "vitest";
import {
  wouldCreateCycle,
  buildModuleTree,
  flattenModuleTree,
  layersOf,
  modulePath,
  subtreeIds,
  rollupModuleStats,
} from "@/lib/modules";

const modules = [
  { id: "root", parentId: null },
  { id: "a", parentId: "root" },
  { id: "b", parentId: "a" },
];

describe("wouldCreateCycle", () => {
  it("allows moving a node to a different ancestor", () => {
    expect(wouldCreateCycle(modules, "b", "root")).toBe(false);
  });

  it("blocks making a node its own parent", () => {
    expect(wouldCreateCycle(modules, "a", "a")).toBe(true);
  });

  it("blocks moving a node under its descendant", () => {
    expect(wouldCreateCycle(modules, "root", "b")).toBe(true);
  });

  it("allows clearing the parent", () => {
    expect(wouldCreateCycle(modules, "a", null)).toBe(false);
  });
});

describe("buildModuleTree", () => {
  it("nests children under parents ordered by position", () => {
    const tree = buildModuleTree([
      { id: "b", parentId: null, name: "B", position: 2000 },
      { id: "a", parentId: null, name: "A", position: 1000 },
      { id: "a1", parentId: "a", name: "A1", position: 1000 },
    ]);
    expect(tree.map((n) => n.id)).toEqual(["a", "b"]);
    expect(tree[0].children.map((n) => n.id)).toEqual(["a1"]);
  });
});

describe("flattenModuleTree", () => {
  it("walks depth-first with depth", () => {
    const tree = buildModuleTree([
      { id: "a", parentId: null, name: "A", position: 0 },
      { id: "a1", parentId: "a", name: "A1", position: 0 },
    ]);
    expect(flattenModuleTree(tree).map((x) => [x.id, x.depth])).toEqual([
      ["a", 0],
      ["a1", 1],
    ]);
  });
});

const architecture = [
  { id: "p", parentId: null, name: "SenseCAP", position: 0 },
  { id: "client", parentId: "p", name: "客户端", position: 1000 },
  { id: "algo", parentId: "p", name: "算法", position: 2000 },
  { id: "win", parentId: "client", name: "Win", position: 1000 },
  { id: "bdd", parentId: "win", name: "端测/BDD", position: 1000 },
  { id: "act", parentId: "algo", name: "ACT", position: 1000 },
];

describe("layersOf", () => {
  it("uses product children as layer titles and their children as module cards", () => {
    const product = buildModuleTree(architecture)[0];
    const layers = layersOf(product);
    expect(layers.map((l) => l.layer.name)).toEqual(["客户端", "算法"]);
    expect(layers[0].modules.map((m) => m.id)).toEqual(["win"]);
    expect(layers[0].modules[0].children.map((m) => m.id)).toEqual(["bdd"]);
    expect(layers[1].modules.map((m) => m.id)).toEqual(["act"]);
  });

  it("returns no layers for a product with only a name", () => {
    expect(layersOf({ id: "p", parentId: null, name: "Empty", position: 0, children: [] })).toEqual([]);
  });
});

describe("modulePath", () => {
  it("joins ancestor names from product down to the node", () => {
    expect(modulePath(architecture, "bdd")).toBe("SenseCAP / 客户端 / Win / 端测/BDD");
    expect(modulePath(architecture, "p")).toBe("SenseCAP");
  });

  it("returns the node name when the id is unknown", () => {
    expect(modulePath(architecture, "nope")).toBe("");
  });
});

describe("subtreeIds", () => {
  it("includes the node and every descendant", () => {
    const win = buildModuleTree(architecture)[0].children[0].children[0];
    expect(subtreeIds(win).sort()).toEqual(["bdd", "win"]);
  });
});

describe("rollupModuleStats", () => {
  it("rolls a leaf task up to Win, the layer, and the product", () => {
    const stats = rollupModuleStats(architecture, [
      { moduleId: "bdd", statusType: "ACTIVE" },
    ]);
    expect(stats.bdd).toEqual({ done: 0, total: 1 });
    expect(stats.win).toEqual({ done: 0, total: 1 });
    expect(stats.client).toEqual({ done: 0, total: 1 });
    expect(stats.p).toEqual({ done: 0, total: 1 });
    expect(stats.act).toEqual({ done: 0, total: 0 });
  });

  it("counts DONE and CLOSED as complete", () => {
    const stats = rollupModuleStats(architecture, [
      { moduleId: "bdd", statusType: "DONE" },
      { moduleId: "win", statusType: "CLOSED" },
      { moduleId: "act", statusType: "ACTIVE" },
    ]);
    expect(stats.win).toEqual({ done: 2, total: 2 });
    expect(stats.algo).toEqual({ done: 0, total: 1 });
    expect(stats.p).toEqual({ done: 2, total: 3 });
  });

  it("ignores archived tasks and tasks with no module", () => {
    const stats = rollupModuleStats(architecture, [
      { moduleId: "bdd", statusType: "DONE", archived: true },
      { moduleId: null, statusType: "ACTIVE" },
    ]);
    expect(stats.bdd).toEqual({ done: 0, total: 0 });
    expect(stats.p).toEqual({ done: 0, total: 0 });
  });
});

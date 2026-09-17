import { describe, it, expect } from "vitest";
import { jumpTaskStack, openTaskStack, popTaskStack, pushTaskStack } from "@/lib/task-stack";

describe("openTaskStack", () => {
  it("opens a root task as a single-item stack", () => {
    expect(openTaskStack("a")).toEqual(["a"]);
  });
  it("opens a subtask beside its parent", () => {
    expect(openTaskStack("child", "parent")).toEqual(["parent", "child"]);
  });
});

describe("pushTaskStack", () => {
  it("appends a new task", () => {
    expect(pushTaskStack(["a"], "b")).toEqual(["a", "b"]);
  });
  it("truncates when jumping back to an ancestor", () => {
    expect(pushTaskStack(["a", "b", "c"], "a")).toEqual(["a"]);
    expect(pushTaskStack(["a", "b", "c"], "b")).toEqual(["a", "b"]);
  });
});

describe("popTaskStack", () => {
  it("drops the last task", () => {
    expect(popTaskStack(["a", "b"])).toEqual(["a"]);
  });
  it("returns empty at the root", () => {
    expect(popTaskStack(["a"])).toEqual([]);
  });
});

describe("jumpTaskStack", () => {
  it("keeps items through the clicked index", () => {
    expect(jumpTaskStack(["a", "b", "c"], 1)).toEqual(["a", "b"]);
  });
});

import { describe, it, expect } from "vitest";
import { diffFieldOptions, scrubFieldValue } from "@/lib/custom-fields";

describe("diffFieldOptions", () => {
  const existing = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("updates kept options, creates unlabeled-id ones, and deletes the rest", () => {
    const diff = diffFieldOptions(existing, [
      { id: "b", label: "Beta" },
      { label: "  Delta  " },
      { id: "ghost", label: "Ghost" },
    ]);
    expect(diff.toUpdate).toEqual([{ id: "b", label: "Beta", position: 0 }]);
    expect(diff.toCreate).toEqual([
      { label: "Delta", position: 1 },
      { label: "Ghost", position: 2 },
    ]);
    expect(diff.toDelete).toEqual(["a", "c"]);
  });

  it("skips blank labels and reports empty when everything is cleared", () => {
    const diff = diffFieldOptions(existing, [{ id: "a", label: "   " }, { label: "" }]);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toCreate).toEqual([]);
    expect(diff.toDelete).toEqual(["a", "b", "c"]);
  });
});

describe("scrubFieldValue", () => {
  const deleted = new Set(["gone"]);

  it("clears a dropdown whose option was deleted", () => {
    expect(scrubFieldValue("DROPDOWN", "gone", deleted)).toBeUndefined();
    expect(scrubFieldValue("DROPDOWN", "kept", deleted)).toBe("kept");
  });

  it("strips deleted labels and clears when none remain", () => {
    expect(scrubFieldValue("LABELS", ["gone", "kept"], deleted)).toEqual(["kept"]);
    expect(scrubFieldValue("LABELS", ["gone"], deleted)).toBeUndefined();
  });

  it("leaves other field types alone", () => {
    expect(scrubFieldValue("TEXT", "hello", deleted)).toBe("hello");
  });
});

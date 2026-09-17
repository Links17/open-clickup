export const OPTION_COLORS = ["#3d8df5", "#2ecd6f", "#ff7800", "#fd71af", "#9b59b6", "#f50000"];

export function fieldNeedsOptions(type: string): boolean {
  return type === "DROPDOWN" || type === "LABELS";
}

export type FieldOptionDraft = { id?: string; label: string };

export type OptionDiff = {
  toCreate: { label: string; position: number }[];
  toUpdate: { id: string; label: string; position: number }[];
  toDelete: string[];
};

export function diffFieldOptions(
  existing: { id: string }[],
  incoming: FieldOptionDraft[],
): OptionDiff {
  const existingIds = new Set(existing.map((e) => e.id));
  const cleaned: { id?: string; label: string; position: number }[] = [];
  for (const o of incoming) {
    const label = o.label.trim();
    if (!label) continue;
    const id = o.id && existingIds.has(o.id) ? o.id : undefined;
    cleaned.push({ id, label, position: cleaned.length });
  }
  const keep = new Set(cleaned.filter((o) => o.id).map((o) => o.id as string));
  return {
    toCreate: cleaned.filter((o) => !o.id).map(({ label, position }) => ({ label, position })),
    toUpdate: cleaned
      .filter((o): o is { id: string; label: string; position: number } => !!o.id)
      .map(({ id, label, position }) => ({ id, label, position })),
    toDelete: existing.filter((e) => !keep.has(e.id)).map((e) => e.id),
  };
}

/** Returns undefined when the stored value should be cleared. */
export function scrubFieldValue(
  type: string,
  value: unknown,
  deletedIds: Set<string>,
): unknown | undefined {
  if (type === "DROPDOWN") {
    if (typeof value === "string" && deletedIds.has(value)) return undefined;
    return value;
  }
  if (type === "LABELS" && Array.isArray(value)) {
    const next = value.filter((id) => typeof id !== "string" || !deletedIds.has(id));
    if (next.length === 0) return undefined;
    return next;
  }
  return value;
}

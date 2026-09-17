import type { ModuleStat } from "@/lib/modules";

export function ModuleProgress({ stat, color }: { stat?: ModuleStat; color?: string }) {
  const total = stat?.total ?? 0;
  const done = stat?.done ?? 0;
  if (total === 0) return null;
  return (
    <span className="shrink-0 text-[11px] tabular-nums" style={color ? { color } : undefined}>
      {done}/{total}
    </span>
  );
}

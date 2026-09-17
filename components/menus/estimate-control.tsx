"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEstimate, parseEstimateMinutes } from "@/lib/time";
import { useT } from "@/lib/i18n";

export function EstimateControl({
  minutes,
  onChange,
  compact = false,
}: {
  minutes: number | null;
  onChange: (minutes: number | null) => void;
  compact?: boolean;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState("");

  function commit() {
    const trimmed = v.trim();
    if (trimmed === "") {
      onChange(null);
    } else {
      const parsed = parseEstimateMinutes(trimmed);
      if (parsed !== null) onChange(parsed);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder={t("time.estimateHint")}
        className="w-[88px] rounded border border-cu-purple bg-cu-panel px-1.5 py-0.5 text-[13px] tabular-nums outline-none"
      />
    );
  }

  const label = formatEstimate(minutes);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setV(label);
        setEditing(true);
      }}
      className="flex items-center gap-1 rounded text-left outline-none"
      title={t("col.estimate")}
    >
      {label ? (
        <span className="text-[13px] tabular-nums text-cu-text">{label}</span>
      ) : (
        <span
          className={cn(
            "flex items-center gap-1 text-[13px] text-cu-text-tertiary hover:text-cu-text-secondary",
            compact && "opacity-0 group-hover:opacity-100 group-hover/row:opacity-100",
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          {compact ? null : t("col.estimate")}
        </span>
      )}
    </button>
  );
}

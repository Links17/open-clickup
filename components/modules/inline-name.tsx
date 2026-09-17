"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function InlineName({
  initial,
  placeholder,
  onSubmit,
  onCancel,
  className,
}: {
  initial?: string;
  placeholder?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [v, setV] = useState(initial ?? "");
  return (
    <input
      autoFocus
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && v.trim()) onSubmit(v.trim());
        if (e.key === "Escape") onCancel();
      }}
      onBlur={() => (v.trim() ? onSubmit(v.trim()) : onCancel())}
      placeholder={placeholder}
      className={cn(
        "w-full rounded border border-cu-purple bg-cu-panel px-1.5 py-0.5 text-[13px] outline-none",
        className,
      )}
    />
  );
}

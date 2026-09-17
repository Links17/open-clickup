"use client";

import { useT } from "@/lib/i18n";

export function ViewPlaceholder({ label }: { label: string }) {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-cu-text-tertiary">
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs">{t("view.coming")}</div>
    </div>
  );
}

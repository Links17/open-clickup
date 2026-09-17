"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, X } from "lucide-react";
import { PriorityFlag } from "@/components/ui/primitives";
import { PRIORITY_ORDER } from "@/lib/constants";
import { Priority } from "@/lib/enums";
import { useT } from "@/lib/i18n";

export function PriorityControl({
  value,
  onChange,
}: {
  value: Priority | null;
  onChange: (p: Priority | null) => void;
}) {
  const t = useT();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center rounded p-0.5 outline-none hover:bg-cu-hover"
          title={value ? t(`priority.${value}`) : t("priority.set")}
        >
          <PriorityFlag priority={value} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="start"
          className="z-50 min-w-[180px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
            {t("priority.title")}
          </div>
          {PRIORITY_ORDER.map((p) => (
            <DropdownMenu.Item
              key={p}
              onSelect={() => onChange(p)}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover focus:bg-cu-hover"
            >
              <PriorityFlag priority={p} />
              <span>{t(`priority.${p}`)}</span>
              {value === p && <Check className="ml-auto h-3.5 w-3.5 text-cu-purple" />}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-cu-border" />
          <DropdownMenu.Item
            onSelect={() => onChange(null)}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] text-cu-text-secondary outline-none hover:bg-cu-hover focus:bg-cu-hover"
          >
            <X className="h-3.5 w-3.5" />
            {t("common.clear")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

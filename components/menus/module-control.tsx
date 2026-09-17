"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, Plus, Boxes } from "lucide-react";
import { useWorkspace } from "@/components/workspace-context";
import { buildModuleTree, flattenModuleTree, modulePath } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export function ModuleControl({
  value,
  onChange,
}: {
  value: { id: string; name: string } | null;
  onChange: (moduleId: string | null) => void;
}) {
  const { workspace } = useWorkspace();
  const t = useT();
  const [query, setQuery] = useState("");
  const tree = buildModuleTree(workspace.modules);
  const q = query.toLowerCase();
  const rows = flattenModuleTree(tree)
    .map((m) => ({ ...m, path: modulePath(workspace.modules, m.id) }))
    .filter((m) => !q || m.path.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex max-w-[220px] items-center gap-1 rounded text-left outline-none"
          title={value ? modulePath(workspace.modules, value.id) : undefined}
        >
          {value ? (
            <span className="truncate text-[13px] text-cu-text">{modulePath(workspace.modules, value.id) || value.name}</span>
          ) : (
            <span className="flex items-center gap-1 text-[13px] text-cu-text-tertiary hover:text-cu-text-secondary">
              <Plus className="h-3.5 w-3.5" /> {t("modulePick.add")}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          onClick={(e) => e.stopPropagation()}
          className="z-50 w-[300px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg"
        >
          <div className="flex items-center gap-1.5 border-b border-cu-border px-2 pb-1.5 pt-1">
            <Boxes className="h-3.5 w-3.5 text-cu-text-tertiary" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("modulePick.search")}
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-cu-text-tertiary"
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto py-1">
            <button
              onClick={() => onChange(null)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-cu-hover"
            >
              <span className="text-cu-text-tertiary">{t("modulePick.none")}</span>
              {!value && <Check className="ml-auto h-3.5 w-3.5 text-cu-purple" />}
            </button>
            {rows.map((m) => (
              <button
                key={m.id}
                onClick={() => onChange(m.id)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-cu-hover"
                style={{ paddingLeft: 8 + m.depth * 12 }}
              >
                <span className={cn("min-w-0 flex-1", value?.id === m.id && "font-medium")}>
                  <span className="block truncate">{m.name}</span>
                  {m.depth > 0 && (
                    <span className="block truncate text-[11px] font-normal text-cu-text-tertiary">{m.path}</span>
                  )}
                </span>
                {value?.id === m.id && <Check className="h-3.5 w-3.5 shrink-0 text-cu-purple" />}
              </button>
            ))}
            {rows.length === 0 && query.trim() && (
              <div className="px-2 py-2 text-[12px] text-cu-text-tertiary">{t("modulePick.noMatch")}</div>
            )}
            {workspace.modules.length === 0 && (
              <div className="px-2 py-2 text-[12px] text-cu-text-tertiary">
                {t("modulePick.noneYet")}
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

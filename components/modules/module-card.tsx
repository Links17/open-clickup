"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiSend } from "@/lib/api";
import { InlineName } from "@/components/modules/inline-name";
import { ModuleProgress } from "@/components/modules/module-progress";
import { StatusControl, type StatusLike } from "@/components/menus/status-control";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ModuleStat, ModuleTreeNode } from "@/lib/modules";
import { useT } from "@/lib/i18n";

export function ModuleCard({
  node,
  depth,
  stats,
  statuses,
  onChange,
  onOpen,
}: {
  node: ModuleTreeNode;
  depth: number;
  stats: Record<string, ModuleStat>;
  statuses: StatusLike[];
  onChange: () => void;
  onOpen: (moduleId: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const t = useT();
  const toast = useToast();
  const compact = depth >= 2;
  const status = statuses.find((s) => s.id === node.statusId) ?? statuses[0];
  const cancelled = status?.type === "CLOSED";

  if (renaming) {
    return (
      <div className="min-w-[140px] rounded-lg border border-cu-purple bg-cu-panel p-2">
        <InlineName
          initial={node.name}
          onSubmit={async (name) => {
            await apiSend(`/api/modules/${node.id}`, "PATCH", { name });
            setRenaming(false);
            onChange();
          }}
          onCancel={() => setRenaming(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/card min-w-[140px] rounded-lg border",
        compact ? "p-1.5" : "p-2.5",
        cancelled && "opacity-55",
      )}
      style={
        status
          ? {
              background: `color-mix(in srgb, ${status.color} 14%, var(--cu-panel))`,
              borderColor: `color-mix(in srgb, ${status.color} 22%, transparent)`,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-1.5">
        {status && (
          <StatusControl
            current={status}
            statuses={statuses}
            onChange={async (statusId) => {
              await apiSend(`/api/modules/${node.id}`, "PATCH", { statusId });
              onChange();
            }}
          />
        )}
        <button
          type="button"
          onClick={() => onOpen(node.id)}
          className={cn("min-w-0 flex-1 truncate text-left font-medium text-cu-text hover:underline", compact ? "text-[12px]" : "text-[13px]")}
        >
          {node.name}
        </button>
        <ModuleProgress stat={stats[node.id]} color={status?.color} />
        <div className="hidden shrink-0 group-hover/card:flex">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAdding(true);
            }}
            title={t("modules.addSubmodule")}
            className="rounded p-0.5 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-text"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRenaming(true);
            }}
            title={t("common.rename")}
            className="rounded p-0.5 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-text"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirming(true);
            }}
            title={t("common.delete")}
            className="rounded p-0.5 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-urgent"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {(node.children.length > 0 || adding) && (
        <div className="mt-2 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
          {node.children.map((child) => (
            <ModuleCard
              key={child.id}
              node={child}
              depth={depth + 1}
              stats={stats}
              statuses={statuses}
              onChange={onChange}
              onOpen={onOpen}
            />
          ))}
          {adding && (
            <div className="min-w-[120px]">
              <InlineName
                placeholder={t("modules.submodule")}
                onSubmit={async (name) => {
                  await apiSend("/api/modules", "POST", { name, parentId: node.id });
                  setAdding(false);
                  onChange();
                }}
                onCancel={() => setAdding(false)}
              />
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title={t("common.delete")}
        description={t("modules.confirmDeleteModule", { name: node.name })}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          try {
            await apiSend(`/api/modules/${node.id}`, "DELETE");
            toast.success(t("toast.deleted", { name: node.name }));
            setConfirming(false);
            onChange();
          } catch {
            toast.error(t("toast.deleteFailed"));
          }
        }}
      />
    </div>
  );
}

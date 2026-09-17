"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiSend } from "@/lib/api";
import { layersOf, type ModuleStat, type ModuleTreeNode } from "@/lib/modules";
import { InlineName } from "@/components/modules/inline-name";
import { ModuleCard } from "@/components/modules/module-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { StatusLike } from "@/components/menus/status-control";
import { useT } from "@/lib/i18n";

export function ArchitectureBoard({
  product,
  stats,
  statuses,
  onChange,
  onOpen,
}: {
  product: ModuleTreeNode;
  stats: Record<string, ModuleStat>;
  statuses: StatusLike[];
  onChange: () => void;
  onOpen: (moduleId: string) => void;
}) {
  const layers = layersOf(product);
  const [addingLayer, setAddingLayer] = useState(false);
  const t = useT();

  return (
    <div className="space-y-0">
      {layers.map(({ layer, modules }) => (
        <LayerRow
          key={layer.id}
          layer={layer}
          modules={modules}
          stats={stats}
          statuses={statuses}
          onChange={onChange}
          onOpen={onOpen}
        />
      ))}

      {addingLayer ? (
        <div className="grid grid-cols-[160px_1fr] items-center gap-3 border-t border-cu-border py-3">
          <InlineName
            placeholder={t("modules.layerTitle")}
            onSubmit={async (name) => {
              await apiSend("/api/modules", "POST", { name, parentId: product.id });
              setAddingLayer(false);
              onChange();
            }}
            onCancel={() => setAddingLayer(false)}
          />
          <div />
        </div>
      ) : (
        <button
          onClick={() => setAddingLayer(true)}
          className="mt-2 flex w-full items-center gap-1.5 rounded-lg border border-dashed border-cu-border px-3 py-2.5 text-[13px] text-cu-text-tertiary hover:border-cu-border-strong hover:text-cu-text"
        >
          <Plus className="h-4 w-4" /> {t("modules.addLayer")}
        </button>
      )}
    </div>
  );
}

function LayerRow({
  layer,
  modules,
  stats,
  statuses,
  onChange,
  onOpen,
}: {
  layer: ModuleTreeNode;
  modules: ModuleTreeNode[];
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

  return (
    <>
    <div className="grid grid-cols-[160px_1fr] items-start gap-3 border-t border-cu-border py-3 first:border-t-0">
      <div className="group/layer sticky top-0 flex min-h-[40px] items-start gap-1 pt-1">
        {renaming ? (
          <InlineName
            initial={layer.name}
            onSubmit={async (name) => {
              await apiSend(`/api/modules/${layer.id}`, "PATCH", { name });
              setRenaming(false);
              onChange();
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => onOpen(layer.id)}
              className="min-w-0 flex-1 text-left text-[13px] font-semibold text-cu-text hover:underline"
            >
              {layer.name}
            </button>
            <div className="hidden shrink-0 group-hover/layer:flex">
              <button
                onClick={() => setRenaming(true)}
                title={t("modules.renameLayer")}
                className="rounded p-0.5 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-text"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setConfirming(true)}
                title={t("modules.deleteLayer")}
                className="rounded p-0.5 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-urgent"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex min-h-[40px] flex-wrap items-start gap-2">
        {modules.map((m) => (
          <ModuleCard
            key={m.id}
            node={m}
            depth={0}
            stats={stats}
            statuses={statuses}
            onChange={onChange}
            onOpen={onOpen}
          />
        ))}
        {adding ? (
          <div className="min-w-[140px] rounded-lg border border-cu-purple bg-cu-panel p-2">
            <InlineName
              placeholder={t("modules.moduleName")}
              onSubmit={async (name) => {
                await apiSend("/api/modules", "POST", { name, parentId: layer.id });
                setAdding(false);
                onChange();
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex min-h-[40px] min-w-[140px] items-center justify-center gap-1 rounded-lg border border-dashed border-cu-border px-3 text-[13px] text-cu-text-tertiary hover:border-cu-purple hover:text-cu-text"
          >
            <Plus className="h-3.5 w-3.5" /> {t("modules.module")}
          </button>
        )}
      </div>
    </div>
    <ConfirmDialog
      open={confirming}
      title={t("modules.deleteLayer")}
      description={t("modules.confirmDeleteLayer", { name: layer.name })}
      onClose={() => setConfirming(false)}
      onConfirm={async () => {
        try {
          await apiSend(`/api/modules/${layer.id}`, "DELETE");
          toast.success(t("toast.deleted", { name: layer.name }));
          setConfirming(false);
          onChange();
        } catch {
          toast.error(t("toast.deleteFailed"));
        }
      }}
    />
    </>
  );
}

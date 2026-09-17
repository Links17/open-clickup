"use client";

import { useState } from "react";
import Link from "next/link";
import { Boxes, Plus, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiSend } from "@/lib/api";
import { useWorkspace } from "@/components/workspace-context";
import { buildModuleTree } from "@/lib/modules";
import { InlineName } from "@/components/modules/inline-name";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

export default function ModulesPage() {
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const t = useT();
  const products = buildModuleTree(workspace.modules);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["bootstrap"] });
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-cu-text">{t("modules.products")}</h1>
            <p className="mt-1 text-[13px] text-cu-text-secondary">
              {t("modules.productsHint")}
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 rounded-md bg-cu-purple px-2.5 py-1.5 text-[13px] font-medium text-white hover:bg-cu-purple-dark"
          >
            <Plus className="h-4 w-4" /> {t("modules.newProduct")}
          </button>
        </div>

        {products.length === 0 && !creating && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-cu-border py-16 text-center">
            <Boxes className="h-8 w-8 text-cu-text-tertiary" />
            <p className="text-[14px] font-medium text-cu-text">{t("modules.noProducts")}</p>
            <p className="text-[13px] text-cu-text-tertiary">{t("modules.noProductsHint")}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} id={p.id} name={p.name} layerCount={p.children.length} onChange={refresh} />
          ))}
          {creating && (
            <div className="rounded-xl border border-cu-purple bg-cu-panel p-4">
              <InlineName
                placeholder={t("modules.productName")}
                onSubmit={async (name) => {
                  await apiSend("/api/modules", "POST", { name });
                  setCreating(false);
                  refresh();
                }}
                onCancel={() => setCreating(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  id,
  name,
  layerCount,
  onChange,
}: {
  id: string;
  name: string;
  layerCount: number;
  onChange: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const t = useT();
  const toast = useToast();

  if (renaming) {
    return (
      <div className="rounded-xl border border-cu-purple bg-cu-panel p-4">
        <InlineName
          initial={name}
          onSubmit={async (next) => {
            await apiSend(`/api/modules/${id}`, "PATCH", { name: next });
            setRenaming(false);
            onChange();
          }}
          onCancel={() => setRenaming(false)}
        />
      </div>
    );
  }

  return (
    <div className="group relative rounded-xl border border-cu-border bg-cu-panel p-4 hover:border-cu-border-strong">
      <Link href={`/modules/${id}`} className="block pr-16">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-cu-purple" />
          <span className="truncate text-[15px] font-semibold text-cu-text">{name}</span>
        </div>
        <p className="mt-1.5 text-[12px] text-cu-text-tertiary">
          {layerCount === 0 ? t("modules.noLayers") : t("modules.layerCount", { count: layerCount })}
        </p>
      </Link>
      <div className="absolute right-3 top-3 hidden gap-0.5 group-hover:flex">
        <button
          onClick={() => setRenaming(true)}
          title={t("common.rename")}
          className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-text"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setConfirming(true)}
          title={t("common.delete")}
          className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-urgent"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        title={t("common.delete")}
        description={t("modules.confirmDeleteProduct", { name })}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          try {
            await apiSend(`/api/modules/${id}`, "DELETE");
            toast.success(t("toast.deleted", { name }));
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

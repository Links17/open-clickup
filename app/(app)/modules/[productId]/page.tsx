"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/components/workspace-context";
import { useModuleStats } from "@/lib/hooks";
import { buildModuleTree } from "@/lib/modules";
import { ArchitectureBoard } from "@/components/modules/architecture-board";
import { ModuleTaskPanel } from "@/components/modules/module-task-panel";
import { useT } from "@/lib/i18n";

export default function ProductArchitecturePage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const { workspace } = useWorkspace();
  const qc = useQueryClient();
  const { data: statsData } = useModuleStats();
  const stats = statsData?.stats ?? {};
  const statuses = workspace.moduleStatuses;
  const product = buildModuleTree(workspace.modules).find((p) => p.id === productId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const t = useT();

  function refresh() {
    qc.invalidateQueries({ queryKey: ["bootstrap"] });
    qc.invalidateQueries({ queryKey: ["module-stats"] });
  }

  if (!product) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-[13px] text-cu-text-secondary">
        <p>{t("modules.notFound")}</p>
        <Link href="/modules" className="text-cu-purple hover:underline">
          {t("modules.backToProducts")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Link
            href="/modules"
            className="mb-3 inline-flex items-center gap-1 text-[13px] text-cu-text-secondary hover:text-cu-text"
          >
            <ChevronLeft className="h-4 w-4" /> {t("modules.products")}
          </Link>
          <button
            type="button"
            onClick={() => setSelectedId(product.id)}
            className="mb-6 block text-left text-2xl font-bold text-cu-text hover:underline"
          >
            {product.name}
          </button>
          <ArchitectureBoard
            product={product}
            stats={stats}
            statuses={statuses}
            onChange={refresh}
            onOpen={setSelectedId}
          />
        </div>
      </div>
      {selectedId && (
        <ModuleTaskPanel
          moduleId={selectedId}
          modules={workspace.modules}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

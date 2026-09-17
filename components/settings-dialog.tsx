"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useWorkspace } from "@/components/workspace-context";
import { ModuleStatusEditor } from "@/components/modules/module-status-manager";
import { LOCALES, useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useUpdateDailyCap } from "@/lib/hooks";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { workspace, currentUser } = useWorkspace();
  const { t, locale, setLocale } = useI18n();
  const role = workspace.members.find((m) => m.user.id === currentUser.id)?.role;
  const canEditCap = role === "OWNER" || role === "ADMIN";
  const updateCap = useUpdateDailyCap();
  const [hours, setHours] = useState(String((workspace.dailyHourCapMinutes ?? 600) / 60));
  useEffect(() => {
    setHours(String((workspace.dailyHourCapMinutes ?? 600) / 60));
  }, [workspace.dailyHourCapMinutes]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[min(520px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-cu-panel shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between border-b border-cu-border px-4 py-3">
            <Dialog.Title className="text-[14px] font-semibold text-cu-text">{t("settings.title")}</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-3">
            <p className="mb-2 px-1 text-[12px] font-medium text-cu-text">{t("language.label")}</p>
            <div className="mb-4 flex gap-1 px-1">
              {LOCALES.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLocale(id)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[13px]",
                    locale === id
                      ? "bg-cu-purple text-white"
                      : "border border-cu-border text-cu-text-secondary hover:bg-cu-hover hover:text-cu-text",
                  )}
                >
                  {t(`language.${id}` as `language.${Locale}`)}
                </button>
              ))}
            </div>
            <p className="mb-2 px-1 text-[12px] font-medium text-cu-text">{t("settings.dailyCap")}</p>
            <p className="mb-2 px-1 text-[12px] text-cu-text-tertiary">{t("settings.dailyCapHint")}</p>
            <div className="mb-4 flex items-center gap-2 px-1">
              <input
                type="number"
                min={1}
                max={24}
                step={0.5}
                value={hours}
                disabled={!canEditCap}
                onChange={(e) => setHours(e.target.value)}
                className="w-20 rounded border border-cu-border bg-cu-bg px-2 py-1 text-[13px] outline-none focus:border-cu-purple disabled:opacity-60"
              />
              <span className="text-[13px] text-cu-text-secondary">{t("settings.hours")}</span>
              {canEditCap && (
                <button
                  type="button"
                  onClick={() => {
                    const n = Number(hours);
                    if (!Number.isFinite(n) || n < 1 || n > 24) return;
                    updateCap.mutate(n);
                  }}
                  className="rounded-md bg-cu-purple px-2.5 py-1 text-[13px] font-medium text-white hover:bg-cu-purple-dark disabled:opacity-50"
                  disabled={updateCap.isPending}
                >
                  {t("common.save")}
                </button>
              )}
            </div>
            <p className="mb-2 px-1 text-[12px] font-medium text-cu-text">{t("settings.moduleStatuses")}</p>
            <p className="mb-2 px-1 text-[12px] text-cu-text-tertiary">{t("settings.moduleStatusesHint")}</p>
            <ModuleStatusEditor statuses={workspace.moduleStatuses} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

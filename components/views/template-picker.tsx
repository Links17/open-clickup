"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, FileStack, Trash2, Flag } from "lucide-react";
import { useTemplates, useApplyTemplate, useDeleteTemplate } from "@/lib/hooks";
import { useT } from "@/lib/i18n";

export function TemplatePicker({
  listId,
  onClose,
  onCreated,
}: {
  listId: string;
  onClose: () => void;
  onCreated: (taskId: string) => void;
}) {
  const { data: templates, isLoading } = useTemplates();
  const apply = useApplyTemplate(listId);
  const del = useDeleteTemplate();
  const t = useT();

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-cu-panel shadow-2xl outline-none">
          <div className="flex items-center justify-between border-b border-cu-border px-4 py-3">
            <Dialog.Title className="text-[14px] font-semibold text-cu-text">{t("template.newFrom")}</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="max-h-[380px] overflow-y-auto p-2">
            {isLoading && <p className="px-2 py-6 text-center text-[13px] text-cu-text-tertiary">{t("common.loading")}</p>}
            {!isLoading && (templates?.length ?? 0) === 0 && (
              <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
                <FileStack className="h-7 w-7 text-cu-text-tertiary" />
                <p className="text-[13px] font-medium text-cu-text">{t("template.none")}</p>
                <p className="text-[12px] text-cu-text-tertiary">
                  {t("template.noneHint")}
                </p>
              </div>
            )}
            {templates?.map((tpl) => (
              <div
                key={tpl.id}
                className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-cu-hover"
              >
                <button
                  onClick={() =>
                    apply.mutate(tpl.id, {
                      onSuccess: (task) => {
                        onCreated(task.id);
                        onClose();
                      },
                    })
                  }
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cu-purple-light text-cu-purple">
                    <FileStack className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-cu-text">{tpl.name}</span>
                    <span className="flex items-center gap-1.5 truncate text-[12px] text-cu-text-tertiary">
                      {tpl.taskName}
                      {tpl.priority && <Flag className="h-3 w-3" />}
                      {tpl.checklists && tpl.checklists.length > 0 && <span>· {t("template.checklistsCount", { count: tpl.checklists.length })}</span>}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => del.mutate(tpl.id)}
                  className="rounded p-1 text-cu-text-tertiary opacity-0 transition-opacity hover:text-cu-urgent group-hover:opacity-100"
                  title={t("template.deleteTemplate")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

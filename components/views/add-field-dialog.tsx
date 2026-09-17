"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { X, Plus, Trash2 } from "lucide-react";
import { apiSend } from "@/lib/api";
import { CustomFieldType } from "@/lib/enums";
import { useT } from "@/lib/i18n";
import type { CustomFieldWithOptions } from "@/lib/queries";

const FIELD_TYPES: CustomFieldType[] = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "MONEY",
  "DROPDOWN",
  "LABELS",
  "DATE",
  "CHECKBOX",
  "RATING",
  "URL",
  "EMAIL",
  "PHONE",
];

type OptionDraft = { id?: string; label: string };

export function AddFieldDialog({
  listId,
  field,
  onClose,
}: {
  listId: string;
  field?: CustomFieldWithOptions;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const t = useT();
  const editing = !!field;
  const [name, setName] = useState(field?.name ?? "");
  const [type, setType] = useState<CustomFieldType>(field?.type ?? "TEXT");
  const [options, setOptions] = useState<OptionDraft[]>(
    field?.options.length
      ? field.options.map((o) => ({ id: o.id, label: o.label }))
      : [{ label: "" }, { label: "" }],
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const needsOptions = type === "DROPDOWN" || type === "LABELS";

  function refresh() {
    qc.invalidateQueries({ queryKey: ["list", listId] });
  }

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const payloadOptions = needsOptions
        ? options.filter((o) => o.label.trim()).map((o) => ({ id: o.id, label: o.label.trim() }))
        : undefined;
      if (editing) {
        await apiSend(`/api/custom-fields/${field.id}`, "PATCH", {
          name: name.trim(),
          options: payloadOptions,
        });
      } else {
        await apiSend(`/api/lists/${listId}/custom-fields`, "POST", {
          name: name.trim(),
          type,
          options: payloadOptions?.map((o) => o.label),
        });
      }
      refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!field || busy) return;
    setBusy(true);
    try {
      await apiSend(`/api/custom-fields/${field.id}`, "DELETE");
      refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-cu-border bg-cu-panel shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between border-b border-cu-border px-4 py-3">
            <Dialog.Title className="text-sm font-semibold">
              {editing ? t("field.editField") : t("field.newField")}
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {confirmingDelete ? (
            <div className="space-y-3 p-4">
              <p className="text-[13px] text-cu-text">{t("confirm.deleteNamed", { name })}</p>
              <p className="text-[12px] text-cu-text-secondary">{t("field.deleteWarn")}</p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded px-3 py-1.5 text-[13px] text-cu-text-secondary hover:bg-cu-hover"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={remove}
                  disabled={busy}
                  className="rounded bg-cu-urgent px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-40"
                >
                  {t("field.deleteField")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-4">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">{t("col.name")}</label>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("field.fieldName")}
                    className="w-full rounded border border-cu-border px-2.5 py-1.5 text-[13px] outline-none focus:border-cu-purple"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">{t("field.type")}</label>
                  <select
                    value={type}
                    disabled={editing}
                    onChange={(e) => setType(e.target.value as CustomFieldType)}
                    className="w-full rounded border border-cu-border bg-cu-panel px-2.5 py-1.5 text-[13px] outline-none focus:border-cu-purple disabled:opacity-60"
                  >
                    {FIELD_TYPES.map((ft) => (
                      <option key={ft} value={ft}>{t(`fieldType.${ft}`)}</option>
                    ))}
                  </select>
                  {editing && (
                    <p className="mt-1 text-[11px] text-cu-text-tertiary">{t("field.typeLocked")}</p>
                  )}
                </div>

                {needsOptions && (
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">{t("field.options")}</label>
                    <div className="space-y-1.5">
                      {options.map((opt, i) => (
                        <div key={opt.id ?? `new-${i}`} className="flex items-center gap-2">
                          <input
                            value={opt.label}
                            onChange={(e) =>
                              setOptions((o) => o.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                            }
                            placeholder={t("field.optionN", { n: i + 1 })}
                            className="flex-1 rounded border border-cu-border px-2 py-1 text-[13px] outline-none focus:border-cu-purple"
                          />
                          <button
                            onClick={() => setOptions((o) => o.filter((_, j) => j !== i))}
                            className="rounded p-1 text-cu-text-tertiary hover:text-cu-urgent"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setOptions((o) => [...o, { label: "" }])}
                        className="flex items-center gap-1 text-[12px] text-cu-text-secondary hover:text-cu-text"
                      >
                        <Plus className="h-3.5 w-3.5" /> {t("field.addOption")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-cu-border px-4 py-3">
                {editing ? (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="rounded px-3 py-1.5 text-[13px] text-cu-urgent hover:bg-cu-hover"
                  >
                    {t("field.deleteField")}
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Dialog.Close className="rounded px-3 py-1.5 text-[13px] text-cu-text-secondary hover:bg-cu-hover">{t("common.cancel")}</Dialog.Close>
                  <button
                    onClick={submit}
                    disabled={busy || !name.trim() || (needsOptions && !options.some((o) => o.label.trim()))}
                    className="rounded bg-cu-purple px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-40 hover:bg-cu-purple-dark"
                  >
                    {editing ? t("field.saveField") : t("field.createField")}
                  </button>
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

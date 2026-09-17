"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useT } from "@/lib/i18n";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[min(400px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-cu-border bg-cu-panel p-4 shadow-2xl outline-none"
        >
          <Dialog.Title className="text-[14px] font-semibold text-cu-text">{title}</Dialog.Title>
          <p className="mt-2 text-[13px] leading-snug text-cu-text-secondary">{description}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-md px-2.5 py-1.5 text-[13px] text-cu-text-secondary hover:bg-cu-hover disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirm()}
              className="rounded-md bg-cu-urgent px-2.5 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {confirmLabel ?? t("common.delete")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

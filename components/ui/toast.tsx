"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Check, CircleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error";
type ToastItem = { id: number; kind: Kind; message: string };

export type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = nextId++;
      setItems((prev) => [...prev, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-lg border bg-cu-panel px-3 py-2.5 text-[13px] text-cu-text shadow-lg",
              item.kind === "error" ? "border-cu-urgent/40" : "border-cu-border",
            )}
          >
            {item.kind === "error" ? (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-cu-urgent" />
            ) : (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6bc950]" />
            )}
            <p className="min-w-0 flex-1">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="rounded p-0.5 text-cu-text-tertiary hover:bg-cu-hover"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

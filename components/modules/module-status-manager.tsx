"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { apiSend } from "@/lib/api";
import { StatusType } from "@/lib/enums";
import { ColorSwatch } from "@/components/status/color-swatch";
import type { StatusLike } from "@/components/menus/status-control";
import { useT } from "@/lib/i18n";

const STATUS_TYPES: StatusType[] = ["NOT_STARTED", "ACTIVE", "DONE", "CLOSED"];

export function ModuleStatusEditor({ statuses }: { statuses: StatusLike[] }) {
  const qc = useQueryClient();
  const t = useT();
  const [newName, setNewName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["bootstrap"] });

  async function patch(id: string, data: Partial<Pick<StatusLike, "name" | "color" | "type">>) {
    await apiSend(`/api/module-statuses/${id}`, "PATCH", data);
    refresh();
  }
  async function remove(id: string) {
    await apiSend(`/api/module-statuses/${id}`, "DELETE");
    refresh();
  }
  async function add() {
    if (!newName.trim()) return;
    await apiSend("/api/module-statuses", "POST", { name: newName.trim() });
    setNewName("");
    refresh();
  }
  async function move(index: number, dir: -1 | 1) {
    const next = [...statuses];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    await apiSend("/api/module-statuses", "PUT", { ids: next.map((s) => s.id) });
    refresh();
  }

  return (
    <div>
      {statuses.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-cu-hover/50">
          <div className="flex flex-col">
            <button onClick={() => move(i, -1)} disabled={i === 0} className="text-cu-text-tertiary hover:text-cu-text disabled:opacity-20">
              <ChevronUp className="h-3 w-3" />
            </button>
            <button onClick={() => move(i, 1)} disabled={i === statuses.length - 1} className="text-cu-text-tertiary hover:text-cu-text disabled:opacity-20">
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          <ColorSwatch color={s.color} type={s.type} onPick={(color) => patch(s.id, { color })} />

          <input
            defaultValue={s.name}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.name) patch(s.id, { name: v }); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] font-medium outline-none hover:border-cu-border focus:border-cu-purple"
            style={{ color: s.color }}
          />

          <select
            value={s.type}
            onChange={(e) => patch(s.id, { type: e.target.value as StatusType })}
            className="rounded border border-cu-border bg-cu-panel px-1.5 py-1 text-[12px] text-cu-text-secondary outline-none"
          >
            {STATUS_TYPES.map((type) => (
              <option key={type} value={type}>{t(`statusType.${type}`)}</option>
            ))}
          </select>

          <button
            onClick={() => remove(s.id)}
            disabled={statuses.length <= 1}
            className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-urgent disabled:opacity-20"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="mt-2 flex items-center gap-2 border-t border-cu-border pt-3">
        <Plus className="h-4 w-4 text-cu-text-tertiary" />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder={t("modules.newStatus")}
          className="flex-1 rounded border border-cu-border px-2 py-1.5 text-[13px] outline-none focus:border-cu-purple"
        />
        <button
          onClick={add}
          disabled={!newName.trim()}
          className="rounded bg-cu-purple px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-40 hover:bg-cu-purple-dark"
        >
          {t("common.add")}
        </button>
      </div>
    </div>
  );
}

"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check } from "lucide-react";
import { STATUS_PALETTE } from "@/lib/constants";
import { StatusCircle } from "@/components/menus/status-control";
import type { StatusType } from "@/lib/enums";

export function ColorSwatch({
  color,
  type,
  onPick,
}: {
  color: string;
  type: StatusType;
  onPick: (color: string) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex items-center justify-center rounded p-0.5 hover:bg-cu-hover">
          <StatusCircle status={{ color, type }} size={16} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} className="z-[60] grid grid-cols-6 gap-1.5 rounded-lg border border-cu-border bg-cu-panel p-2 shadow-lg">
          {STATUS_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => onPick(c)}
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: c }}
            >
              {c === color && <Check className="h-3.5 w-3.5 text-white" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

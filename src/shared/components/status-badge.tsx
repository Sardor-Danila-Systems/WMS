import { ArrowDownToLine, ArrowUpFromLine, Hammer, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { MOVEMENT_META, STOCK_STATUS, type StockStatus } from "@/constants/colors";
import type { MovementType } from "@/types";

const MOVEMENT_ICONS: Record<MovementType, typeof ArrowDownToLine> = {
  RECEIPT: ArrowDownToLine,
  ISSUE: ArrowUpFromLine,
  USAGE: Hammer,
  RETURN: RotateCcw,
};

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const meta = MOVEMENT_META[type];
  const Icon = MOVEMENT_ICONS[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium",
        meta.bg,
        meta.text,
        meta.border
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const meta = STOCK_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        meta.bg,
        meta.text
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

/** Показывает знак и величину изменения остатка: +120 / −40. */
export function DeltaValue({ value, unit }: { value: number; unit?: string }) {
  if (value === 0) return <span className="text-muted-foreground">—</span>;
  const positive = value > 0;
  return (
    <span
      className={cn(
        "whitespace-nowrap font-medium tabular-nums",
        positive ? "text-green-700" : "text-red-700"
      )}
    >
      {positive ? "+" : "−"}
      {new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(Math.abs(value))}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}

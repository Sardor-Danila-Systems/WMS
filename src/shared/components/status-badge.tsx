"use client";

import { ArrowDownToLine, ArrowUpFromLine, Hammer, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { MOVEMENT_COLORS, STOCK_STATUS_COLORS, type StockStatus } from "@/constants/colors";
import { useIntlTag, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import type { MovementType } from "@/types";

const MOVEMENT_ICONS: Record<MovementType, typeof ArrowDownToLine> = {
  RECEIPT: ArrowDownToLine,
  ISSUE: ArrowUpFromLine,
  USAGE: Hammer,
  RETURN: RotateCcw,
};

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const t = useT();
  const style = MOVEMENT_COLORS[type];
  const Icon = MOVEMENT_ICONS[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[12.5px] font-medium",
        style.bg,
        style.text,
        style.border
      )}
    >
      <Icon className="h-3 w-3" />
      {t(`movements.${type}`)}
    </span>
  );
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const t = useT();
  const style = STOCK_STATUS_COLORS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[12.5px] font-medium",
        style.bg,
        style.text
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.color }} />
      {t(`stockStatus.${status}`)}
    </span>
  );
}

/** Показывает знак и величину изменения остатка: +120 / −40. */
export function DeltaValue({ value, unit }: { value: number; unit?: string }) {
  const locale = useIntlTag();
  if (value === 0) return <span className="text-muted-foreground">—</span>;
  const positive = value > 0;
  return (
    <span
      className={cn(
        "whitespace-nowrap font-medium tabular-nums",
        positive ? "text-[#256d3c]" : "text-[#9c2f2f]"
      )}
    >
      {positive ? "+" : "−"}
      {formatNumber(Math.abs(value), locale)}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}

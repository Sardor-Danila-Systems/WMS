import { ArrowDownToLine, ArrowUpFromLine, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { OPERATION_META, STOCK_STATUS } from "@/constants/colors";
import type { OperationType } from "@/types";

const OPERATION_ICONS: Record<OperationType, typeof ArrowDownToLine> = {
  receipt: ArrowDownToLine,
  issue: ArrowUpFromLine,
  return: RotateCcw,
};

export function OperationTypeBadge({ type }: { type: OperationType }) {
  const meta = OPERATION_META[type];
  const Icon = OPERATION_ICONS[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
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

export function StockStatusBadge({ status }: { status: keyof typeof STOCK_STATUS }) {
  const meta = STOCK_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        meta.bg,
        meta.text
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

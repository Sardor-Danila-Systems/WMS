import type { OperationType } from "@/types";

/** Категориальная палитра по типу операции — фиксированный порядок, не переназначается фильтрами. */
export const OPERATION_META: Record<
  OperationType,
  { label: string; color: string; bg: string; text: string; border: string }
> = {
  receipt: {
    label: "Поступление",
    color: "#2a78d6",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  issue: {
    label: "Выдача",
    color: "#eb6834",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  return: {
    label: "Возврат",
    color: "#4a3aa7",
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
  },
};

/** Статусная палитра (фиксирована, не используется для категориальных серий). */
export const STOCK_STATUS = {
  good: { label: "В норме", color: "#0ca30c", bg: "bg-green-50", text: "text-green-700" },
  warning: { label: "Заканчивается", color: "#c98500", bg: "bg-amber-50", text: "text-amber-700" },
  critical: { label: "Критический остаток", color: "#d03b3b", bg: "bg-red-50", text: "text-red-700" },
} as const;

export function getStockStatus(quantity: number, minStock: number): keyof typeof STOCK_STATUS {
  if (quantity <= minStock) return "critical";
  if (quantity <= minStock * 1.5) return "warning";
  return "good";
}

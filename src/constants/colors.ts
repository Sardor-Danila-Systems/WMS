import type { MovementType } from "@/types";

/** Категориальная палитра по типу операции — фиксированный порядок, не переназначается фильтрами. */
export const MOVEMENT_META: Record<
  MovementType,
  {
    label: string;
    /** Короткое описание направления движения для истории. */
    from: string;
    to: string;
    color: string;
    bg: string;
    text: string;
    border: string;
  }
> = {
  RECEIPT: {
    label: "Поступление",
    from: "Поставщик",
    to: "Склад",
    color: "#2a78d6",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  ISSUE: {
    label: "Выдача",
    from: "Склад",
    to: "Бригадир",
    color: "#eb6834",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  USAGE: {
    label: "Использование",
    from: "Бригадир",
    to: "Объект",
    color: "#0e8a6a",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
  RETURN: {
    label: "Возврат",
    from: "Бригадир",
    to: "Склад",
    color: "#4a3aa7",
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
  },
};

export const MOVEMENT_TYPES: MovementType[] = ["RECEIPT", "ISSUE", "USAGE", "RETURN"];

/** Статусная палитра (фиксирована, не используется для категориальных серий). */
export const STOCK_STATUS = {
  good: { label: "В норме", color: "#0ca30c", bg: "bg-green-50", text: "text-green-700" },
  warning: { label: "Заканчивается", color: "#c98500", bg: "bg-amber-50", text: "text-amber-700" },
  critical: { label: "Критический остаток", color: "#d03b3b", bg: "bg-red-50", text: "text-red-700" },
} as const;

export type StockStatus = keyof typeof STOCK_STATUS;

export function getStockStatus(quantity: number, minStock: number): StockStatus {
  // Материал без заданной нормы не может быть «критическим» — сравнивать не с чем.
  if (minStock <= 0) return quantity > 0 ? "good" : "critical";
  if (quantity <= minStock) return "critical";
  if (quantity <= minStock * 1.5) return "warning";
  return "good";
}

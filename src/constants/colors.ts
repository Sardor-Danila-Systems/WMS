import type { MovementType } from "@/types";

/**
 * Цвета по типу операции. Подписи живут в словаре — здесь только палитра,
 * чтобы цвет операции не зависел от языка интерфейса.
 * Порядок фиксирован и не переназначается фильтрами.
 */
export const MOVEMENT_COLORS: Record<
  MovementType,
  { color: string; bg: string; text: string; border: string }
> = {
  RECEIPT: {
    color: "#2563a8",
    bg: "bg-[#eef4fb]",
    text: "text-[#1d4e7f]",
    border: "border-[#cfe0f2]",
  },
  ISSUE: {
    color: "#c2621f",
    bg: "bg-[#fdf2e9]",
    text: "text-[#9c4d16]",
    border: "border-[#f3ddc4]",
  },
  USAGE: {
    color: "#12776a",
    bg: "bg-[#eaf6f4]",
    text: "text-[#0e5f55]",
    border: "border-[#c7e5e0]",
  },
  RETURN: {
    color: "#5b4bb0",
    bg: "bg-[#f1effa]",
    text: "text-[#463a8c]",
    border: "border-[#d8d2f0]",
  },
};

export const MOVEMENT_TYPES: MovementType[] = ["RECEIPT", "ISSUE", "USAGE", "RETURN"];

/** Статусная палитра (фиксирована, не используется для категориальных серий). */
export const STOCK_STATUS_COLORS = {
  good: { color: "#2f8f4e", bg: "bg-[#edf7f0]", text: "text-[#256d3c]" },
  warning: { color: "#b57d13", bg: "bg-[#fdf5e6]", text: "text-[#8d6210]" },
  critical: { color: "#c33c3c", bg: "bg-[#fdefef]", text: "text-[#9c2f2f]" },
} as const;

export type StockStatus = keyof typeof STOCK_STATUS_COLORS;

export function getStockStatus(quantity: number, minStock: number): StockStatus {
  // Материал без заданной нормы не может быть «критическим» — сравнивать не с чем.
  if (minStock <= 0) return quantity > 0 ? "good" : "critical";
  if (quantity <= minStock) return "critical";
  if (quantity <= minStock * 1.5) return "warning";
  return "good";
}

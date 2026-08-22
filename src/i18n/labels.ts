"use client";

import { useTranslations } from "next-intl";

import type { StockStatus } from "@/constants/colors";
import type { MovementType, Role } from "@/types";

/**
 * Подписи для значений-перечислений. Ключ приходит из данных, поэтому
 * доступ обёрнут в отдельные функции — так вызов остаётся типобезопасным,
 * а не превращается в динамическую строку.
 */
export function useMovementLabel(): (type: MovementType) => string {
  const t = useTranslations("movements");
  return (type) => t(type);
}

export function useRoleLabel(): (role: Role) => string {
  const t = useTranslations("roles");
  return (role) => t(role);
}

export function useStockStatusLabel(): (status: StockStatus) => string {
  const t = useTranslations("stockStatus");
  return (status) => t(status);
}

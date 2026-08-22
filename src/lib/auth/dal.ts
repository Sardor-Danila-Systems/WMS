import "@/lib/server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getSessionUser, type SessionUser } from "./session";
import type { Role } from "@/types";
import { BusinessError } from "@/server/errors";

/**
 * Права ролей. ADMIN — всё; WAREHOUSE_WORKER — ежедневные складские операции
 * и просмотр, но не управление справочниками, сотрудниками и настройками.
 */
export const PERMISSIONS = {
  // Операции движения материалов
  "movement:create": ["ADMIN", "WAREHOUSE_WORKER"],
  // Справочники
  "material:write": ["ADMIN", "WAREHOUSE_WORKER"],
  "material:delete": ["ADMIN"],
  "foreman:write": ["ADMIN", "WAREHOUSE_WORKER"],
  "project:write": ["ADMIN"],
  "supplier:write": ["ADMIN"],
  // Администрирование
  "user:write": ["ADMIN"],
  "settings:write": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function roleCan(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/**
 * Читает пользователя один раз за проход рендера.
 * `cache` из React убирает повторные обращения к базе, когда сессия
 * нужна сразу нескольким компонентам одной страницы.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return getSessionUser();
});

/** Для страниц и действий, доступных только вошедшему пользователю. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Проверка прав внутри server action. Бросает ошибку вместо редиректа —
 * server actions вызываются напрямую по POST, и клиент должен получить отказ.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!roleCan(user.role, permission)) {
    throw new BusinessError("NO_PERMISSION");
  }
  return user;
}

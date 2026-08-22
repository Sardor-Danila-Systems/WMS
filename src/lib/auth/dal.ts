import "@/lib/server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getSessionUser, type SessionUser } from "./session";
import { BusinessError } from "@/server/errors";
import { roleCan, type Permission } from "./permissions";

export { roleCan, PERMISSIONS, type Permission } from "./permissions";

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

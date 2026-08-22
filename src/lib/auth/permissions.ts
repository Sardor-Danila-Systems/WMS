import type { Role } from "@/types";

/**
 * Права ролей. ADMIN — всё; WAREHOUSE_WORKER — ежедневные складские операции
 * и просмотр, но не управление справочниками, сотрудниками и настройками.
 *
 * Модуль намеренно без серверных зависимостей: те же правила нужны в браузере,
 * чтобы не показывать пункты меню, которые сервер всё равно отклонит.
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

import type { Role } from "@/types";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Администратор",
  WAREHOUSE_WORKER: "Работник склада",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Полный доступ: операции, справочники, сотрудники, отчёты и настройки",
  WAREHOUSE_WORKER: "Приём, выдача, использование и возврат материалов, просмотр склада",
};

export const ROLE_OPTIONS: Role[] = ["ADMIN", "WAREHOUSE_WORKER"];

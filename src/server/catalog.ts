import "@/lib/server-only";

import { randomUUID } from "node:crypto";

import { execute, queryOne, transaction } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { roundQty } from "@/lib/validation";
import type { Role } from "@/types";
import { BusinessError } from "./errors";
import { countMaterialMovements } from "./queries";
import { recordMovementInTx } from "./movements";

/* ------------------------------------------------------------------ */
/* Материалы                                                           */
/* ------------------------------------------------------------------ */

export interface CreateMaterialInput {
  name: string;
  category: string;
  unit: string;
  minStock: number;
  initialQuantity: number;
  /** Кто заводит материал — попадёт в движение «начальный остаток». */
  userId: string;
}

/**
 * Создаёт материал. Начальный остаток не проставляется числом напрямую:
 * он оформляется полноценным движением RECEIPT, поэтому равенство
 * «остаток = сумма движений» выполняется с самого первого дня жизни материала.
 */
export function createMaterial(input: CreateMaterialInput): { id: string } {
  return transaction(() => {
    const existing = queryOne<{ id: string }>(
      "SELECT id FROM materials WHERE LOWER(name) = LOWER(?)",
      input.name
    );
    if (existing) throw new BusinessError("Материал с таким названием уже есть", "name");

    const id = randomUUID();
    const now = new Date().toISOString();

    execute(
      `INSERT INTO materials (id, name, category, unit, quantity, min_stock, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, 1, ?, ?)`,
      id,
      input.name,
      input.category,
      input.unit,
      roundQty(input.minStock),
      now,
      now
    );

    const initial = roundQty(input.initialQuantity);
    if (initial > 0) {
      recordMovementInTx({
        type: "RECEIPT",
        materialId: id,
        quantity: initial,
        userId: input.userId,
        occurredAt: now,
        comment: "Начальный остаток при заведении материала",
      });
    }

    return { id };
  });
}

export function updateMaterial(
  id: string,
  input: { name: string; category: string; unit: string; minStock: number }
): void {
  const material = queryOne<{ id: string; unit: string }>("SELECT id, unit FROM materials WHERE id = ?", id);
  if (!material) throw new BusinessError("Материал не найден");

  const duplicate = queryOne<{ id: string }>(
    "SELECT id FROM materials WHERE LOWER(name) = LOWER(?) AND id <> ?",
    input.name,
    id
  );
  if (duplicate) throw new BusinessError("Материал с таким названием уже есть", "name");

  // Единица измерения задаёт смысл всех прошлых чисел в журнале —
  // менять её после первой операции значит задним числом переписать историю.
  if (input.unit !== material.unit && countMaterialMovements(id) > 0) {
    throw new BusinessError(
      "Нельзя изменить единицу измерения: по материалу уже есть движения",
      "unit"
    );
  }

  execute(
    "UPDATE materials SET name = ?, category = ?, unit = ?, min_stock = ?, updated_at = ? WHERE id = ?",
    input.name,
    input.category,
    input.unit,
    roundQty(input.minStock),
    new Date().toISOString(),
    id
  );
}

/**
 * Удаляет материал только если по нему нет ни одного движения.
 * Материал с историей архивируется — так история операций не теряется.
 */
export function deleteMaterial(id: string): { archived: boolean } {
  return transaction(() => {
    const material = queryOne<{ id: string; quantity: number }>(
      "SELECT id, quantity FROM materials WHERE id = ?",
      id
    );
    if (!material) throw new BusinessError("Материал не найден");

    if (countMaterialMovements(id) > 0) {
      throw new BusinessError(
        "Материал участвует в истории движений — его нельзя удалить. Используйте архивирование."
      );
    }

    const atForemen = queryOne<{ c: number }>(
      "SELECT COUNT(*) AS c FROM foreman_stock WHERE material_id = ? AND quantity > 0",
      id
    );
    if ((atForemen?.c ?? 0) > 0) {
      throw new BusinessError("Материал числится на руках у бригадиров — удаление запрещено");
    }

    execute("DELETE FROM foreman_stock WHERE material_id = ?", id);
    execute("DELETE FROM materials WHERE id = ?", id);
    return { archived: false };
  });
}

export function setMaterialArchived(id: string, archived: boolean): void {
  const material = queryOne<{ quantity: number }>("SELECT quantity FROM materials WHERE id = ?", id);
  if (!material) throw new BusinessError("Материал не найден");
  if (archived && material.quantity > 0) {
    throw new BusinessError("Нельзя архивировать материал с ненулевым остатком на складе");
  }
  execute("UPDATE materials SET is_active = ?, updated_at = ? WHERE id = ?", archived ? 0 : 1, new Date().toISOString(), id);
}

/* ------------------------------------------------------------------ */
/* Бригадиры                                                           */
/* ------------------------------------------------------------------ */

export interface ForemanInput {
  name: string;
  phone: string;
  brigade: string;
  projectId: string;
  isActive: boolean;
}

export function createForeman(input: ForemanInput): { id: string } {
  const id = randomUUID();
  execute(
    `INSERT INTO foremen (id, name, phone, brigade, project_id, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.phone,
    input.brigade,
    input.projectId || null,
    input.isActive ? 1 : 0,
    new Date().toISOString()
  );
  return { id };
}

export function updateForeman(id: string, input: ForemanInput): void {
  const foreman = queryOne<{ id: string }>("SELECT id FROM foremen WHERE id = ?", id);
  if (!foreman) throw new BusinessError("Бригадир не найден");

  if (!input.isActive) {
    const held = queryOne<{ c: number }>(
      "SELECT COUNT(*) AS c FROM foreman_stock WHERE foreman_id = ? AND quantity > 0",
      id
    );
    if ((held?.c ?? 0) > 0) {
      throw new BusinessError(
        "У бригадира есть материалы на руках — сначала оформите использование или возврат"
      );
    }
  }

  execute(
    "UPDATE foremen SET name = ?, phone = ?, brigade = ?, project_id = ?, is_active = ? WHERE id = ?",
    input.name,
    input.phone,
    input.brigade,
    input.projectId || null,
    input.isActive ? 1 : 0,
    id
  );
}

/* ------------------------------------------------------------------ */
/* Объекты и поставщики                                                */
/* ------------------------------------------------------------------ */

export function createProject(input: { name: string; address: string; isActive: boolean }): { id: string } {
  const id = randomUUID();
  execute(
    "INSERT INTO projects (id, name, address, is_active, created_at) VALUES (?, ?, ?, ?, ?)",
    id,
    input.name,
    input.address,
    input.isActive ? 1 : 0,
    new Date().toISOString()
  );
  return { id };
}

export function updateProject(
  id: string,
  input: { name: string; address: string; isActive: boolean }
): void {
  const changed = execute(
    "UPDATE projects SET name = ?, address = ?, is_active = ? WHERE id = ?",
    input.name,
    input.address,
    input.isActive ? 1 : 0,
    id
  );
  if (changed.changes === 0) throw new BusinessError("Объект не найден");
}

export function createSupplier(input: { name: string; contact: string; isActive: boolean }): { id: string } {
  const id = randomUUID();
  execute(
    "INSERT INTO suppliers (id, name, contact, is_active, created_at) VALUES (?, ?, ?, ?, ?)",
    id,
    input.name,
    input.contact,
    input.isActive ? 1 : 0,
    new Date().toISOString()
  );
  return { id };
}

export function updateSupplier(
  id: string,
  input: { name: string; contact: string; isActive: boolean }
): void {
  const changed = execute(
    "UPDATE suppliers SET name = ?, contact = ?, is_active = ? WHERE id = ?",
    input.name,
    input.contact,
    input.isActive ? 1 : 0,
    id
  );
  if (changed.changes === 0) throw new BusinessError("Поставщик не найден");
}

/* ------------------------------------------------------------------ */
/* Сотрудники                                                          */
/* ------------------------------------------------------------------ */

export interface CreateUserInput {
  username: string;
  fullName: string;
  position: string;
  phone: string;
  role: Role;
  password: string;
}

export function createUser(input: CreateUserInput): { id: string } {
  const existing = queryOne<{ id: string }>(
    "SELECT id FROM users WHERE LOWER(username) = LOWER(?)",
    input.username
  );
  if (existing) throw new BusinessError("Такой логин уже занят", "username");

  const id = randomUUID();
  execute(
    `INSERT INTO users (id, username, password_hash, full_name, position, phone, role, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    id,
    input.username.toLowerCase(),
    hashPassword(input.password),
    input.fullName,
    input.position,
    input.phone,
    input.role,
    new Date().toISOString()
  );
  return { id };
}

export function updateUser(
  id: string,
  input: { fullName: string; position: string; phone: string; role: Role; isActive: boolean; password?: string }
): void {
  const user = queryOne<{ id: string; role: Role }>("SELECT id, role FROM users WHERE id = ?", id);
  if (!user) throw new BusinessError("Сотрудник не найден");

  // Система без администратора становится неуправляемой.
  if (user.role === "ADMIN" && (input.role !== "ADMIN" || !input.isActive)) {
    const admins = queryOne<{ c: number }>(
      "SELECT COUNT(*) AS c FROM users WHERE role = 'ADMIN' AND is_active = 1 AND id <> ?",
      id
    );
    if ((admins?.c ?? 0) === 0) {
      throw new BusinessError("Это последний активный администратор — роль нельзя понизить");
    }
  }

  execute(
    "UPDATE users SET full_name = ?, position = ?, phone = ?, role = ?, is_active = ? WHERE id = ?",
    input.fullName,
    input.position,
    input.phone,
    input.role,
    input.isActive ? 1 : 0,
    id
  );

  if (input.password) {
    execute("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(input.password), id);
    // Смена пароля должна выкидывать все прежние сессии этого пользователя.
    execute("DELETE FROM sessions WHERE user_id = ?", id);
  }
}

/* ------------------------------------------------------------------ */
/* Настройки                                                           */
/* ------------------------------------------------------------------ */

export function getSetting(key: string, fallback = ""): string {
  return queryOne<{ value: string }>("SELECT value FROM settings WHERE key = ?", key)?.value ?? fallback;
}

export function setSetting(key: string, value: string): void {
  execute(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    key,
    value
  );
}

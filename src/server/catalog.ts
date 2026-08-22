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
  /** Текст комментария к движению начального остатка на языке пользователя. */
  initialStockComment: string;
}

/**
 * Создаёт материал. Начальный остаток не проставляется числом напрямую:
 * он оформляется полноценным движением RECEIPT, поэтому равенство
 * «остаток = сумма движений» выполняется с самого первого дня жизни материала.
 */
export async function createMaterial(input: CreateMaterialInput): Promise<{ id: string }> {
  return transaction(async (tx) => {
    const existing = await tx.one<{ id: string }>(
      "SELECT id FROM materials WHERE lower(name) = lower(?)",
      input.name
    );
    if (existing) throw new BusinessError("MATERIAL_NAME_EXISTS", { field: "name" });

    const id = randomUUID();
    const now = new Date().toISOString();

    await tx.run(
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
      await recordMovementInTx(tx, {
        type: "RECEIPT",
        materialId: id,
        quantity: initial,
        userId: input.userId,
        occurredAt: now,
        comment: input.initialStockComment,
      });
    }

    return { id };
  });
}

export async function updateMaterial(
  id: string,
  input: { name: string; category: string; unit: string; minStock: number }
): Promise<void> {
  const material = await queryOne<{ id: string; unit: string }>(
    "SELECT id, unit FROM materials WHERE id = ?",
    id
  );
  if (!material) throw new BusinessError("MATERIAL_NOT_FOUND");

  const duplicate = await queryOne<{ id: string }>(
    "SELECT id FROM materials WHERE lower(name) = lower(?) AND id <> ?",
    input.name,
    id
  );
  if (duplicate) throw new BusinessError("MATERIAL_NAME_EXISTS", { field: "name" });

  // Единица измерения задаёт смысл всех прошлых чисел в журнале —
  // менять её после первой операции значит задним числом переписать историю.
  if (input.unit !== material.unit && (await countMaterialMovements(id)) > 0) {
    throw new BusinessError("UNIT_LOCKED", { field: "unit" });
  }

  await execute(
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
export async function deleteMaterial(id: string): Promise<{ archived: boolean }> {
  return transaction(async (tx) => {
    const material = await tx.one<{ id: string; quantity: number }>(
      "SELECT id, quantity FROM materials WHERE id = ?",
      id
    );
    if (!material) throw new BusinessError("MATERIAL_NOT_FOUND");

    const movements = await tx.one<{ c: number }>(
      "SELECT COUNT(*)::int AS c FROM stock_movements WHERE material_id = ?",
      id
    );
    if ((movements?.c ?? 0) > 0) {
      throw new BusinessError("MATERIAL_HAS_HISTORY");
    }

    const atForemen = await tx.one<{ c: number }>(
      "SELECT COUNT(*)::int AS c FROM foreman_stock WHERE material_id = ? AND quantity > 0",
      id
    );
    if ((atForemen?.c ?? 0) > 0) {
      throw new BusinessError("MATERIAL_AT_FOREMEN");
    }

    await tx.run("DELETE FROM foreman_stock WHERE material_id = ?", id);
    await tx.run("DELETE FROM materials WHERE id = ?", id);
    return { archived: false };
  });
}

export async function setMaterialArchived(id: string, archived: boolean): Promise<void> {
  const material = await queryOne<{ quantity: number }>(
    "SELECT quantity FROM materials WHERE id = ?",
    id
  );
  if (!material) throw new BusinessError("MATERIAL_NOT_FOUND");
  if (archived && material.quantity > 0) {
    throw new BusinessError("MATERIAL_STOCK_NOT_ZERO");
  }
  await execute(
    "UPDATE materials SET is_active = ?, updated_at = ? WHERE id = ?",
    archived ? 0 : 1,
    new Date().toISOString(),
    id
  );
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

export async function createForeman(input: ForemanInput): Promise<{ id: string }> {
  const id = randomUUID();
  await execute(
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

export async function updateForeman(id: string, input: ForemanInput): Promise<void> {
  const foreman = await queryOne<{ id: string }>("SELECT id FROM foremen WHERE id = ?", id);
  if (!foreman) throw new BusinessError("FOREMAN_NOT_FOUND");

  if (!input.isActive) {
    const held = await queryOne<{ c: number }>(
      "SELECT COUNT(*)::int AS c FROM foreman_stock WHERE foreman_id = ? AND quantity > 0",
      id
    );
    if ((held?.c ?? 0) > 0) {
      throw new BusinessError("FOREMAN_HAS_STOCK");
    }
  }

  await execute(
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

export async function createProject(input: {
  name: string;
  address: string;
  isActive: boolean;
}): Promise<{ id: string }> {
  const id = randomUUID();
  await execute(
    "INSERT INTO projects (id, name, address, is_active, created_at) VALUES (?, ?, ?, ?, ?)",
    id,
    input.name,
    input.address,
    input.isActive ? 1 : 0,
    new Date().toISOString()
  );
  return { id };
}

export async function updateProject(
  id: string,
  input: { name: string; address: string; isActive: boolean }
): Promise<void> {
  const changed = await execute(
    "UPDATE projects SET name = ?, address = ?, is_active = ? WHERE id = ?",
    input.name,
    input.address,
    input.isActive ? 1 : 0,
    id
  );
  if (changed.changes === 0) throw new BusinessError("PROJECT_NOT_FOUND");
}

export async function createSupplier(input: {
  name: string;
  contact: string;
  isActive: boolean;
}): Promise<{ id: string }> {
  const id = randomUUID();
  await execute(
    "INSERT INTO suppliers (id, name, contact, is_active, created_at) VALUES (?, ?, ?, ?, ?)",
    id,
    input.name,
    input.contact,
    input.isActive ? 1 : 0,
    new Date().toISOString()
  );
  return { id };
}

export async function updateSupplier(
  id: string,
  input: { name: string; contact: string; isActive: boolean }
): Promise<void> {
  const changed = await execute(
    "UPDATE suppliers SET name = ?, contact = ?, is_active = ? WHERE id = ?",
    input.name,
    input.contact,
    input.isActive ? 1 : 0,
    id
  );
  if (changed.changes === 0) throw new BusinessError("SUPPLIER_NOT_FOUND");
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

export async function createUser(input: CreateUserInput): Promise<{ id: string }> {
  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM users WHERE lower(username) = lower(?)",
    input.username
  );
  if (existing) throw new BusinessError("USERNAME_TAKEN", { field: "username" });

  const id = randomUUID();
  await execute(
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

export async function updateUser(
  id: string,
  input: {
    fullName: string;
    position: string;
    phone: string;
    role: Role;
    isActive: boolean;
    password?: string;
  }
): Promise<void> {
  const user = await queryOne<{ id: string; role: Role }>(
    "SELECT id, role FROM users WHERE id = ?",
    id
  );
  if (!user) throw new BusinessError("USER_NOT_FOUND");

  // Система без администратора становится неуправляемой.
  if (user.role === "ADMIN" && (input.role !== "ADMIN" || !input.isActive)) {
    const admins = await queryOne<{ c: number }>(
      "SELECT COUNT(*)::int AS c FROM users WHERE role = 'ADMIN' AND is_active = 1 AND id <> ?",
      id
    );
    if ((admins?.c ?? 0) === 0) {
      throw new BusinessError("LAST_ADMIN");
    }
  }

  await execute(
    "UPDATE users SET full_name = ?, position = ?, phone = ?, role = ?, is_active = ? WHERE id = ?",
    input.fullName,
    input.position,
    input.phone,
    input.role,
    input.isActive ? 1 : 0,
    id
  );

  if (input.password) {
    await execute("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(input.password), id);
    // Смена пароля должна выкидывать все прежние сессии этого пользователя.
    await execute("DELETE FROM sessions WHERE user_id = ?", id);
  }
}

/* ------------------------------------------------------------------ */
/* Настройки                                                           */
/* ------------------------------------------------------------------ */

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const row = await queryOne<{ value: string }>("SELECT value FROM settings WHERE key = ?", key);
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await execute(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    key,
    value
  );
}

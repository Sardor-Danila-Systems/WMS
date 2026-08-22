import "@/lib/server-only";

import { db, transaction } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { roundQty } from "@/lib/validation";
import type { Role } from "@/types";
import { BusinessError } from "./errors";
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
    const existing = await tx.material.findFirst({
      where: { name: { equals: input.name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) throw new BusinessError("MATERIAL_NAME_EXISTS", { field: "name" });

    const material = await tx.material.create({
      data: {
        name: input.name,
        category: input.category,
        unit: input.unit,
        quantity: 0,
        minStock: roundQty(input.minStock),
      },
      select: { id: true },
    });

    const initial = roundQty(input.initialQuantity);
    if (initial > 0) {
      await recordMovementInTx(tx, {
        type: "RECEIPT",
        materialId: material.id,
        quantity: initial,
        userId: input.userId,
        occurredAt: new Date().toISOString(),
        comment: input.initialStockComment,
      });
    }

    return { id: material.id };
  });
}

export async function updateMaterial(
  id: string,
  input: { name: string; category: string; unit: string; minStock: number }
): Promise<void> {
  const material = await db.material.findUnique({ where: { id }, select: { unit: true } });
  if (!material) throw new BusinessError("MATERIAL_NOT_FOUND");

  const duplicate = await db.material.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" }, id: { not: id } },
    select: { id: true },
  });
  if (duplicate) throw new BusinessError("MATERIAL_NAME_EXISTS", { field: "name" });

  // Единица измерения задаёт смысл всех прошлых чисел в журнале —
  // менять её после первой операции значит задним числом переписать историю.
  if (input.unit !== material.unit) {
    const movements = await db.stockMovement.count({ where: { materialId: id } });
    if (movements > 0) throw new BusinessError("UNIT_LOCKED", { field: "unit" });
  }

  await db.material.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      unit: input.unit,
      minStock: roundQty(input.minStock),
    },
  });
}

/**
 * Удаляет материал только если по нему нет ни одного движения.
 * Материал с историей архивируется — так история операций не теряется.
 */
export async function deleteMaterial(id: string): Promise<{ archived: boolean }> {
  return transaction(async (tx) => {
    const material = await tx.material.findUnique({ where: { id }, select: { id: true } });
    if (!material) throw new BusinessError("MATERIAL_NOT_FOUND");

    const movements = await tx.stockMovement.count({ where: { materialId: id } });
    if (movements > 0) throw new BusinessError("MATERIAL_HAS_HISTORY");

    const atForemen = await tx.foremanStock.count({
      where: { materialId: id, quantity: { gt: 0 } },
    });
    if (atForemen > 0) throw new BusinessError("MATERIAL_AT_FOREMEN");

    await tx.foremanStock.deleteMany({ where: { materialId: id } });
    await tx.material.delete({ where: { id } });
    return { archived: false };
  });
}

export async function setMaterialArchived(id: string, archived: boolean): Promise<void> {
  const material = await db.material.findUnique({ where: { id }, select: { quantity: true } });
  if (!material) throw new BusinessError("MATERIAL_NOT_FOUND");
  if (archived && material.quantity > 0) {
    throw new BusinessError("MATERIAL_STOCK_NOT_ZERO");
  }
  await db.material.update({ where: { id }, data: { isActive: !archived } });
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
  const foreman = await db.foreman.create({
    data: {
      name: input.name,
      phone: input.phone,
      brigade: input.brigade,
      projectId: input.projectId || null,
      isActive: input.isActive,
    },
    select: { id: true },
  });
  return { id: foreman.id };
}

export async function updateForeman(id: string, input: ForemanInput): Promise<void> {
  const foreman = await db.foreman.findUnique({ where: { id }, select: { id: true } });
  if (!foreman) throw new BusinessError("FOREMAN_NOT_FOUND");

  if (!input.isActive) {
    const held = await db.foremanStock.count({ where: { foremanId: id, quantity: { gt: 0 } } });
    if (held > 0) throw new BusinessError("FOREMAN_HAS_STOCK");
  }

  await db.foreman.update({
    where: { id },
    data: {
      name: input.name,
      phone: input.phone,
      brigade: input.brigade,
      projectId: input.projectId || null,
      isActive: input.isActive,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Объекты и поставщики                                                */
/* ------------------------------------------------------------------ */

export async function createProject(input: {
  name: string;
  address: string;
  isActive: boolean;
}): Promise<{ id: string }> {
  const project = await db.project.create({ data: input, select: { id: true } });
  return { id: project.id };
}

export async function updateProject(
  id: string,
  input: { name: string; address: string; isActive: boolean }
): Promise<void> {
  const exists = await db.project.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new BusinessError("PROJECT_NOT_FOUND");
  await db.project.update({ where: { id }, data: input });
}

export async function createSupplier(input: {
  name: string;
  contact: string;
  isActive: boolean;
}): Promise<{ id: string }> {
  const supplier = await db.supplier.create({ data: input, select: { id: true } });
  return { id: supplier.id };
}

export async function updateSupplier(
  id: string,
  input: { name: string; contact: string; isActive: boolean }
): Promise<void> {
  const exists = await db.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new BusinessError("SUPPLIER_NOT_FOUND");
  await db.supplier.update({ where: { id }, data: input });
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
  const existing = await db.user.findFirst({
    where: { username: { equals: input.username, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw new BusinessError("USERNAME_TAKEN", { field: "username" });

  const user = await db.user.create({
    data: {
      username: input.username.toLowerCase(),
      passwordHash: hashPassword(input.password),
      fullName: input.fullName,
      position: input.position,
      phone: input.phone,
      role: input.role,
    },
    select: { id: true },
  });
  return { id: user.id };
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
  const user = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!user) throw new BusinessError("USER_NOT_FOUND");

  // Система без администратора становится неуправляемой.
  if (user.role === "ADMIN" && (input.role !== "ADMIN" || !input.isActive)) {
    const admins = await db.user.count({
      where: { role: "ADMIN", isActive: true, id: { not: id } },
    });
    if (admins === 0) throw new BusinessError("LAST_ADMIN");
  }

  await db.user.update({
    where: { id },
    data: {
      fullName: input.fullName,
      position: input.position,
      phone: input.phone,
      role: input.role,
      isActive: input.isActive,
      ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
    },
  });

  if (input.password) {
    // Смена пароля должна выкидывать все прежние сессии этого пользователя.
    await db.session.deleteMany({ where: { userId: id } });
  }
}

/* ------------------------------------------------------------------ */
/* Настройки                                                           */
/* ------------------------------------------------------------------ */

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const row = await db.setting.findUnique({ where: { key }, select: { value: true } });
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

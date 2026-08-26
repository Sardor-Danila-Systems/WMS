import "@/lib/server-only";

import { db, transaction } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { roundMoney, roundQty } from "@/lib/validation";
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
  price: number;
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
        price: roundMoney(input.price),
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
        unitPrice: roundMoney(input.price),
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
  input: { name: string; category: string; unit: string; price: number; minStock: number }
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
      price: roundMoney(input.price),
      minStock: roundQty(input.minStock),
    },
  });
}

/**
 * Меняет только цену. Уже проведённые операции не трогает: их сумма
 * зафиксирована в журнале, иначе прошлые накладные «поплыли» бы задним числом.
 */
export async function updateMaterialPrice(id: string, price: number): Promise<void> {
  const material = await db.material.findUnique({ where: { id }, select: { id: true } });
  if (!material) throw new BusinessError("MATERIAL_NOT_FOUND");
  if (!Number.isFinite(price) || price < 0) {
    throw new BusinessError("PRICE_NEGATIVE", { field: "price" });
  }
  await db.material.update({ where: { id }, data: { price: roundMoney(price) } });
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

    const atBlocks = await tx.blockStock.count({
      where: { materialId: id, quantity: { gt: 0 } },
    });
    if (atBlocks > 0) throw new BusinessError("MATERIAL_AT_BLOCKS");

    await tx.blockStock.deleteMany({ where: { materialId: id } });
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
/* Блоки                                                               */
/* ------------------------------------------------------------------ */

export interface BlockInput {
  name: string;
  description: string;
  organizationId: string;
  sortOrder: number;
  isActive: boolean;
}

export async function createBlock(input: BlockInput): Promise<{ id: string }> {
  const existing = await db.block.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw new BusinessError("BLOCK_NAME_EXISTS", { field: "name" });

  const block = await db.block.create({
    data: {
      name: input.name,
      description: input.description,
      organizationId: input.organizationId || null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
    select: { id: true },
  });
  return { id: block.id };
}

export async function updateBlock(id: string, input: BlockInput): Promise<void> {
  const block = await db.block.findUnique({ where: { id }, select: { id: true } });
  if (!block) throw new BusinessError("BLOCK_NOT_FOUND");

  const duplicate = await db.block.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" }, id: { not: id } },
    select: { id: true },
  });
  if (duplicate) throw new BusinessError("BLOCK_NAME_EXISTS", { field: "name" });

  // Закрывать блок, за которым ещё числится материал, нельзя:
  // остаток просто исчез бы из виду, оставшись в журнале.
  if (!input.isActive) {
    const held = await db.blockStock.count({ where: { blockId: id, quantity: { gt: 0 } } });
    if (held > 0) throw new BusinessError("BLOCK_HAS_STOCK");
  }

  await db.block.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      organizationId: input.organizationId || null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Организации и поставщики                                            */
/* ------------------------------------------------------------------ */

export interface OrganizationInput {
  name: string;
  address: string;
  inn: string;
  phone: string;
  isActive: boolean;
}

export async function createOrganization(input: OrganizationInput): Promise<{ id: string }> {
  const existing = await db.organization.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw new BusinessError("ORGANIZATION_NAME_EXISTS", { field: "name" });

  const organization = await db.organization.create({ data: input, select: { id: true } });
  return { id: organization.id };
}

export async function updateOrganization(id: string, input: OrganizationInput): Promise<void> {
  const exists = await db.organization.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new BusinessError("ORGANIZATION_NOT_FOUND");

  const duplicate = await db.organization.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" }, id: { not: id } },
    select: { id: true },
  });
  if (duplicate) throw new BusinessError("ORGANIZATION_NAME_EXISTS", { field: "name" });

  await db.organization.update({ where: { id }, data: input });
}

export interface SupplierInput {
  name: string;
  contact: string;
  phone: string;
  inn: string;
  isActive: boolean;
}

export async function createSupplier(input: SupplierInput): Promise<{ id: string }> {
  const existing = await db.supplier.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw new BusinessError("SUPPLIER_NAME_EXISTS", { field: "name" });

  const supplier = await db.supplier.create({ data: input, select: { id: true } });
  return { id: supplier.id };
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<void> {
  const exists = await db.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new BusinessError("SUPPLIER_NOT_FOUND");

  const duplicate = await db.supplier.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" }, id: { not: id } },
    select: { id: true },
  });
  if (duplicate) throw new BusinessError("SUPPLIER_NAME_EXISTS", { field: "name" });

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

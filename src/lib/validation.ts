import { z } from "zod";

/**
 * Сообщения схем — это КЛЮЧИ словаря, а не готовый текст: одна и та же схема
 * используется и в браузере, и на сервере, а язык у пользователя может быть любой.
 * Перевод подставляется при показе — см. `translateValidation`.
 */

/**
 * Количество материала. Ловит 0, отрицательные значения, NaN и Infinity
 * до того, как они дойдут до базы.
 */
export const quantitySchema = z.coerce
  .number({ error: "validation.quantityRequired" })
  .refine((v) => Number.isFinite(v), { error: "validation.quantityNumber" })
  .refine((v) => v > 0, { error: "validation.quantityPositive" })
  .refine((v) => v <= 1_000_000_000, { error: "validation.quantityTooLarge" });

export const nonNegativeSchema = z.coerce
  .number({ error: "validation.numberRequired" })
  .refine((v) => Number.isFinite(v), { error: "validation.numberFinite" })
  .refine((v) => v >= 0, { error: "validation.numberNonNegative" });

/** Дата операции: принимаем как `2026-08-21`, так и полный ISO из формы. */
export const occurredAtSchema = z
  .string({ error: "validation.dateRequired" })
  .min(1, { error: "validation.dateRequired" })
  .refine((v) => !Number.isNaN(new Date(v).getTime()), { error: "validation.dateInvalid" });

const idSchema = (message: string) =>
  z.string({ error: message }).trim().min(1, { error: message });

export const receiptSchema = z.object({
  materialId: idSchema("validation.materialRequired"),
  quantity: quantitySchema,
  supplierId: z.string().trim().optional().default(""),
  vehicleNumber: z.string().trim().max(32, { error: "validation.vehicleTooLong" }).optional().default(""),
  occurredAt: occurredAtSchema,
  comment: z.string().trim().max(500).optional().default(""),
});

export const issueSchema = z.object({
  materialId: idSchema("validation.materialRequired"),
  quantity: quantitySchema,
  foremanId: idSchema("validation.foremanRequired"),
  projectId: z.string().trim().optional().default(""),
  occurredAt: occurredAtSchema,
  comment: z.string().trim().max(500).optional().default(""),
});

export const usageSchema = z.object({
  materialId: idSchema("validation.materialRequired"),
  quantity: quantitySchema,
  foremanId: idSchema("validation.foremanRequired"),
  projectId: z.string().trim().optional().default(""),
  occurredAt: occurredAtSchema,
  comment: z.string().trim().max(500).optional().default(""),
});

export const returnSchema = z.object({
  materialId: idSchema("validation.materialRequired"),
  quantity: quantitySchema,
  foremanId: idSchema("validation.foremanRequired"),
  reason: z.string().trim().optional().default(""),
  occurredAt: occurredAtSchema,
  comment: z.string().trim().max(500).optional().default(""),
});

export const materialSchema = z.object({
  name: z.string({ error: "validation.nameMin" }).trim().min(2, { error: "validation.nameMin" }).max(120),
  category: z.string({ error: "validation.categoryRequired" }).trim().min(1, { error: "validation.categoryRequired" }),
  unit: z.string({ error: "validation.unitRequired" }).trim().min(1, { error: "validation.unitRequired" }),
  minStock: nonNegativeSchema,
  /** Начальный остаток задаётся только при создании материала. */
  initialQuantity: nonNegativeSchema.optional().default(0),
});

export const foremanSchema = z.object({
  name: z.string({ error: "validation.nameRequired" }).trim().min(2, { error: "validation.nameRequired" }).max(120),
  phone: z.string().trim().max(32).optional().default(""),
  brigade: z.string().trim().max(80).optional().default(""),
  projectId: z.string().trim().optional().default(""),
  isActive: z.coerce.boolean().optional().default(true),
});

export const projectSchema = z.object({
  name: z.string({ error: "validation.projectNameRequired" }).trim().min(2, { error: "validation.projectNameRequired" }).max(120),
  address: z.string().trim().max(200).optional().default(""),
  isActive: z.coerce.boolean().optional().default(true),
});

export const supplierSchema = z.object({
  name: z.string({ error: "validation.supplierNameRequired" }).trim().min(2, { error: "validation.supplierNameRequired" }).max(140),
  contact: z.string().trim().max(80).optional().default(""),
  isActive: z.coerce.boolean().optional().default(true),
});

export const userSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { error: "validation.loginMin" })
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, { error: "validation.loginFormat" }),
  fullName: z.string({ error: "validation.fullNameRequired" }).trim().min(2, { error: "validation.fullNameRequired" }).max(120),
  position: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(32).optional().default(""),
  role: z.enum(["ADMIN", "WAREHOUSE_WORKER"], { error: "validation.roleRequired" }),
  password: z.string().min(6, { error: "validation.passwordMin" }).max(200),
});

export const loginSchema = z.object({
  username: z.string({ error: "validation.loginRequired" }).trim().min(1, { error: "validation.loginRequired" }),
  password: z.string().min(1, { error: "validation.passwordRequired" }),
});

/** Приводит числа к 3 знакам, чтобы копеечные хвосты float не накапливались в остатках. */
export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000;
}

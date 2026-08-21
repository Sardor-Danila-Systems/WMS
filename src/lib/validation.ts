import { z } from "zod";

/**
 * Количество материала. Ловит 0, отрицательные значения, NaN и Infinity
 * до того, как они дойдут до базы.
 */
export const quantitySchema = z.coerce
  .number({ error: "Введите количество" })
  .refine((v) => Number.isFinite(v), { error: "Количество должно быть числом" })
  .refine((v) => v > 0, { error: "Количество должно быть больше 0" })
  .refine((v) => v <= 1_000_000_000, { error: "Слишком большое количество" });

export const nonNegativeSchema = z.coerce
  .number({ error: "Введите число" })
  .refine((v) => Number.isFinite(v), { error: "Значение должно быть числом" })
  .refine((v) => v >= 0, { error: "Значение не может быть отрицательным" });

/** Дата операции: принимаем как `2026-08-21`, так и полный ISO из формы. */
export const occurredAtSchema = z
  .string()
  .min(1, { error: "Укажите дату" })
  .refine((v) => !Number.isNaN(new Date(v).getTime()), { error: "Некорректная дата" });

const idSchema = (message: string) => z.string().trim().min(1, { error: message });

export const receiptSchema = z.object({
  materialId: idSchema("Выберите материал"),
  quantity: quantitySchema,
  supplierId: z.string().trim().optional().default(""),
  vehicleNumber: z.string().trim().max(32, { error: "Слишком длинный номер" }).optional().default(""),
  occurredAt: occurredAtSchema,
  comment: z.string().trim().max(500).optional().default(""),
});

export const issueSchema = z.object({
  materialId: idSchema("Выберите материал"),
  quantity: quantitySchema,
  foremanId: idSchema("Выберите бригадира"),
  projectId: z.string().trim().optional().default(""),
  occurredAt: occurredAtSchema,
  comment: z.string().trim().max(500).optional().default(""),
});

export const usageSchema = z.object({
  materialId: idSchema("Выберите материал"),
  quantity: quantitySchema,
  foremanId: idSchema("Выберите бригадира"),
  projectId: z.string().trim().optional().default(""),
  occurredAt: occurredAtSchema,
  comment: z.string().trim().max(500).optional().default(""),
});

export const returnSchema = z.object({
  materialId: idSchema("Выберите материал"),
  quantity: quantitySchema,
  foremanId: idSchema("Выберите бригадира"),
  reason: z.string().trim().optional().default(""),
  occurredAt: occurredAtSchema,
  comment: z.string().trim().max(500).optional().default(""),
});

export const materialSchema = z.object({
  name: z.string().trim().min(2, { error: "Название минимум 2 символа" }).max(120),
  category: z.string().trim().min(1, { error: "Выберите категорию" }),
  unit: z.string().trim().min(1, { error: "Выберите единицу измерения" }),
  minStock: nonNegativeSchema,
  /** Начальный остаток задаётся только при создании материала. */
  initialQuantity: nonNegativeSchema.optional().default(0),
});

export const foremanSchema = z.object({
  name: z.string().trim().min(2, { error: "Укажите имя" }).max(120),
  phone: z.string().trim().max(32).optional().default(""),
  brigade: z.string().trim().max(80).optional().default(""),
  projectId: z.string().trim().optional().default(""),
  isActive: z.coerce.boolean().optional().default(true),
});

export const projectSchema = z.object({
  name: z.string().trim().min(2, { error: "Укажите название объекта" }).max(120),
  address: z.string().trim().max(200).optional().default(""),
  isActive: z.coerce.boolean().optional().default(true),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(2, { error: "Укажите название поставщика" }).max(140),
  contact: z.string().trim().max(80).optional().default(""),
  isActive: z.coerce.boolean().optional().default(true),
});

export const userSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { error: "Логин минимум 3 символа" })
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, { error: "Только латиница, цифры, точка, дефис и подчёркивание" }),
  fullName: z.string().trim().min(2, { error: "Укажите ФИО" }).max(120),
  position: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(32).optional().default(""),
  role: z.enum(["ADMIN", "WAREHOUSE_WORKER"], { error: "Выберите роль" }),
  password: z.string().min(6, { error: "Пароль минимум 6 символов" }).max(200),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, { error: "Введите логин" }),
  password: z.string().min(1, { error: "Введите пароль" }),
});

/** Приводит числа к 3 знакам, чтобы копеечные хвосты float не накапливались в остатках. */
export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000;
}

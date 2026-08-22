import { formatQuantity } from "@/lib/format";
import type { LooseTranslate } from "@/i18n/loose";

/** Коды бизнес-ошибок без параметров. */
export type SimpleErrorCode =
  | "MATERIAL_NOT_FOUND"
  | "MATERIAL_ARCHIVED"
  | "MATERIAL_NAME_EXISTS"
  | "MATERIAL_HAS_HISTORY"
  | "MATERIAL_AT_FOREMEN"
  | "MATERIAL_STOCK_NOT_ZERO"
  | "UNIT_LOCKED"
  | "FOREMAN_NOT_FOUND"
  | "FOREMAN_INACTIVE"
  | "FOREMAN_REQUIRED"
  | "FOREMAN_HAS_STOCK"
  | "PROJECT_NOT_FOUND"
  | "SUPPLIER_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "USERNAME_TAKEN"
  | "LAST_ADMIN"
  | "QUANTITY_POSITIVE"
  | "DATE_INVALID"
  | "NO_PERMISSION";

/** Коды, которым нужен доступный остаток. */
export type AmountErrorCode =
  | "INSUFFICIENT_STOCK"
  | "INSUFFICIENT_FOREMAN_STOCK_RETURN"
  | "INSUFFICIENT_FOREMAN_STOCK_USAGE";

export type ErrorCode = SimpleErrorCode | AmountErrorCode;

/**
 * Ошибка бизнес-правила. Несёт код, а не готовый текст: перевод подставляется
 * на границе server action, где известен язык пользователя.
 */
export class BusinessError extends Error {
  readonly code: ErrorCode;
  /** Поле формы, к которому относится ошибка. */
  readonly field?: string;
  /** Доступный остаток для сообщений о нехватке материала. */
  readonly amount?: { value: number; unit: string };

  constructor(
    code: ErrorCode,
    options: { field?: string; amount?: { value: number; unit: string } } = {}
  ) {
    super(code);
    this.name = "BusinessError";
    this.code = code;
    this.field = options.field;
    this.amount = options.amount;
  }
}

/** Переводит ошибку в сообщение для пользователя. */
export function toActionError(
  error: unknown,
  t: LooseTranslate,
  intlTag: string,
  unitLabel: (unit: string) => string
): { error: string; field?: string } {
  if (error instanceof BusinessError) {
    if (error.amount) {
      const available = formatQuantity(error.amount.value, unitLabel(error.amount.unit), intlTag);
      return { error: t(`errors.${error.code}`, { available }), field: error.field };
    }
    return { error: t(`errors.${error.code}`), field: error.field };
  }

  // Нарушение ограничений базы — последний рубеж защиты целостности.
  const message = error instanceof Error ? error.message : "";
  if (/violates check constraint/i.test(message)) return { error: t("errors.CONSTRAINT") };
  if (/duplicate key value|Unique constraint/i.test(message)) return { error: t("errors.DUPLICATE") };
  if (/violates foreign key constraint|Foreign key constraint/i.test(message)) {
    return { error: t("errors.IN_USE") };
  }

  console.error("[wms] Непредвиденная ошибка операции:", error);
  return { error: t("errors.UNKNOWN") };
}

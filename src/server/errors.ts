import { formatQuantity } from "@/lib/format";
import { translateValue } from "@/i18n";
import type { Dictionary, Locale } from "@/i18n/types";

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
  dict: Dictionary,
  locale: Locale
): { error: string; field?: string } {
  if (error instanceof BusinessError) {
    const messages = dict.errors;

    if (error.amount) {
      const available = formatQuantity(
        error.amount.value,
        translateValue(dict.units, error.amount.unit),
        locale
      );
      switch (error.code) {
        case "INSUFFICIENT_STOCK":
          return { error: messages.INSUFFICIENT_STOCK(available), field: error.field };
        case "INSUFFICIENT_FOREMAN_STOCK_RETURN":
          return {
            error: messages.INSUFFICIENT_FOREMAN_STOCK_RETURN(available),
            field: error.field,
          };
        case "INSUFFICIENT_FOREMAN_STOCK_USAGE":
          return {
            error: messages.INSUFFICIENT_FOREMAN_STOCK_USAGE(available),
            field: error.field,
          };
      }
    }

    const message = messages[error.code as SimpleErrorCode];
    return { error: typeof message === "string" ? message : messages.UNKNOWN, field: error.field };
  }

  // Нарушение ограничений базы — последний рубеж защиты целостности.
  if (error instanceof Error && /violates check constraint/i.test(error.message)) {
    return { error: dict.errors.CONSTRAINT };
  }
  if (error instanceof Error && /duplicate key value/i.test(error.message)) {
    return { error: dict.errors.DUPLICATE };
  }
  if (error instanceof Error && /violates foreign key constraint/i.test(error.message)) {
    return { error: dict.errors.IN_USE };
  }

  console.error("[wms] Непредвиденная ошибка операции:", error);
  return { error: dict.errors.UNKNOWN };
}

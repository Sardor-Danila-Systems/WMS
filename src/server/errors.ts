/**
 * Ошибка бизнес-правила (не хватает остатка, материал не найден и т.п.).
 * Её текст безопасно показывать пользователю, в отличие от системных ошибок.
 */
export class BusinessError extends Error {
  /** Поле формы, к которому относится ошибка, если применимо. */
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "BusinessError";
    this.field = field;
  }
}

export function toActionError(error: unknown): { error: string; field?: string } {
  if (error instanceof BusinessError) {
    return { error: error.message, field: error.field };
  }
  // Нарушение ограничений базы — последний рубеж защиты целостности.
  if (error instanceof Error && /CHECK constraint failed/i.test(error.message)) {
    return { error: "Операция нарушает правила учёта и была отменена" };
  }
  if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) {
    return { error: "Запись с такими данными уже существует" };
  }
  if (error instanceof Error && /FOREIGN KEY constraint failed/i.test(error.message)) {
    return { error: "Запись используется в других данных и не может быть изменена" };
  }
  console.error("[wms] Непредвиденная ошибка операции:", error);
  return { error: "Не удалось выполнить операцию. Попробуйте ещё раз." };
}

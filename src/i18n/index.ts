import { ru } from "./dictionaries/ru";
import { uz } from "./dictionaries/uz";
import { DEFAULT_LOCALE, type Dictionary, type Locale } from "./types";

const DICTIONARIES: Record<Locale, Dictionary> = { ru, uz };

export function getDictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Значения справочников (единицы, категории, причины возврата) хранятся
 * в базе по-русски — это их постоянный ключ. Для показа берём перевод,
 * а если его нет (например, категорию добавили позже) — исходное значение.
 */
export function translateValue(
  map: Record<string, string>,
  value: string | null | undefined
): string {
  if (!value) return "";
  return map[value] ?? value;
}

export * from "./types";
export { ru, uz };

/**
 * Сообщения zod-схем хранятся как ключи вида `validation.quantityPositive`.
 * Здесь они превращаются в текст на языке пользователя; незнакомый ключ
 * возвращается как есть, чтобы ошибка не потерялась.
 */
export function translateValidation(dict: Dictionary, message: string): string {
  if (message.startsWith("validation.")) {
    const key = message.slice("validation.".length) as keyof Dictionary["validation"];
    if (dict.validation[key]) return dict.validation[key];
  }
  // Встроенные сообщения zod приходят на английском. Показывать их пользователю
  // склада нельзя, поэтому подменяем понятным текстом на его языке.
  if (/^Invalid|^Too |^Expected|^Required/i.test(message)) return dict.errors.CONSTRAINT;
  return message;
}

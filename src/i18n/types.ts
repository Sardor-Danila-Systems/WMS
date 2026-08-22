import type { ru } from "./dictionaries/ru";

/**
 * Расширяет литеральные типы до string/number, сохраняя структуру ключей
 * и сигнатуры функций. Благодаря этому другой язык обязан объявить ровно
 * те же ключи (пропуск — ошибка компиляции), но со своими значениями.
 */
type Widen<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends string
    ? string
    : T extends number
      ? number
      : T extends object
        ? { -readonly [K in keyof T]: Widen<T[K]> }
        : T;

export type Dictionary = Widen<typeof ru>;

export const LOCALES = ["ru", "uz"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "wms_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ru" || value === "uz";
}

import "@/lib/server-only";

import { getLocale as getIntlLocale, getTranslations } from "next-intl/server";

import type { LooseTranslate } from "./loose";
import { INTL_LOCALE, type Locale } from "./types";

/** Текущий язык интерфейса на сервере. */
export async function getLocale(): Promise<Locale> {
  return (await getIntlLocale()) as Locale;
}

/** Переводчик для серверных компонентов и server actions. */
export async function getT() {
  return getTranslations();
}

/** Локаль для Intl-форматирования чисел и дат. */
export async function getIntlTag(): Promise<string> {
  return INTL_LOCALE[await getLocale()];
}

/**
 * Переводчик справочных значений на сервере: категории, единицы измерения
 * и причины возврата хранятся в базе по-русски и переводятся при показе.
 */
export async function getValueTranslator(
  namespace: "units" | "categories" | "returnReasons"
): Promise<(value: string | null | undefined) => string> {
  const t = await getTranslations(namespace);
  return (value) => {
    if (!value) return "";
    // @ts-expect-error — ключ приходит из данных, а не из типа сообщений
    return t.has(value) ? (t(value) as string) : value;
  };
}

/**
 * Переводчик со свободной сигнатурой — для мест, где ключ вычисляется
 * из кода ошибки, а не пишется литералом. Приведение типа собрано здесь,
 * чтобы не повторяться в каждом вызове.
 */
export async function getLooseT(): Promise<LooseTranslate> {
  const t = await getTranslations();
  return (key, values) => (t as unknown as LooseTranslate)(key, values);
}

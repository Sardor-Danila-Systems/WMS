import "@/lib/server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { getDictionaryFor } from "./index";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Dictionary, type Locale } from "./types";

/**
 * Текущий язык из cookie. Читается один раз за проход рендера —
 * его запрашивают почти все серверные компоненты страницы.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** Словарь для серверных компонентов и server actions. */
export const getDictionary = cache(async (): Promise<Dictionary> => {
  return getDictionaryFor(await getLocale());
});

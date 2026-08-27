"use client";

import { useLocale, useTranslations } from "next-intl";

import type { LooseTranslate } from "./loose";
import { INTL_LOCALE, type Locale } from "./types";

/** Переводчик: `t("dashboard.title")`. */
export function useT() {
  return useTranslations();
}

/** Текущий язык интерфейса. */
export function useAppLocale(): Locale {
  return useLocale() as Locale;
}

/** Локаль для Intl-форматирования чисел и дат. */
export function useIntlTag(): string {
  return INTL_LOCALE[useAppLocale()];
}

/**
 * Переводчик со свободной сигнатурой — для мест, где ключ вычисляется
 * из данных, а не пишется литералом. Приведение типа собрано здесь,
 * чтобы не повторяться в каждом вызове.
 */
export function useLooseT(): LooseTranslate {
  const t = useTranslations();
  return (key, values) => (t as unknown as LooseTranslate)(key, values);
}

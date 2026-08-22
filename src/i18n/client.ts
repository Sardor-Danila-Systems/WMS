"use client";

import { useLocale, useTranslations } from "next-intl";

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

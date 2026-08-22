"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { getDictionaryFor } from "./index";
import type { Dictionary, Locale } from "./types";

interface I18nValue {
  t: Dictionary;
  locale: Locale;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * С сервера приходит только код языка: в словаре есть функции для подстановки
 * значений, а функции нельзя передать через границу серверных компонентов.
 * Поэтому словарь собирается здесь, на клиенте, по этому коду.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => ({ locale, t: getDictionaryFor(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n можно вызывать только внутри <I18nProvider>");
  }
  return value;
}

/** Короткий доступ к словарю: `const t = useT();` */
export function useT(): Dictionary {
  return useI18n().t;
}

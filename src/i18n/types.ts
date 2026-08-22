export const LOCALES = ["ru", "uz"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "wms_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ru" || value === "uz";
}

/** Как называется язык в переключателе. */
export const LOCALE_LABELS: Record<Locale, { name: string; short: string }> = {
  ru: { name: "Русский", short: "RU" },
  uz: { name: "O'zbekcha", short: "UZ" },
};

/** Локаль для Intl (форматы чисел и дат). */
export const INTL_LOCALE: Record<Locale, string> = {
  ru: "ru-RU",
  uz: "uz-UZ",
};

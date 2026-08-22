import type { Locale } from "@/i18n/types";

const INTL_LOCALE: Record<Locale, string> = {
  ru: "ru-RU",
  uz: "uz-UZ",
};

function intl(locale: Locale = "ru"): string {
  return INTL_LOCALE[locale] ?? INTL_LOCALE.ru;
}

export function formatDate(iso: string, locale: Locale = "ru"): string {
  return new Date(iso).toLocaleDateString(intl(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(iso: string, locale: Locale = "ru"): string {
  return new Date(iso).toLocaleString(intl(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLongDate(iso: string, locale: Locale = "ru"): string {
  return new Date(iso).toLocaleDateString(intl(locale), { day: "2-digit", month: "long" });
}

export function formatNumber(value: number, locale: Locale = "ru"): string {
  return new Intl.NumberFormat(intl(locale), { maximumFractionDigits: 3 }).format(value);
}

/** Количество с единицей измерения; единица уже должна быть переведена. */
export function formatQuantity(value: number, unit: string, locale: Locale = "ru"): string {
  return `${formatNumber(value, locale)} ${unit}`;
}

/**
 * Правильное окончание слова при числе.
 * В русском три формы (1 позиция / 2 позиции / 5 позиций),
 * в узбекском форма одна — поэтому там все три варианта совпадают.
 */
export function declOf(count: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/**
 * Форматирование чисел и дат. Принимает тег локали (`ru-RU`, `uz-UZ`) —
 * его отдают `useIntlTag()` в браузере и `getIntlTag()` на сервере.
 */
const DEFAULT_TAG = "ru-RU";

export function formatDate(iso: string, locale: string = DEFAULT_TAG): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(iso: string, locale: string = DEFAULT_TAG): string {
  return new Date(iso).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLongDate(iso: string, locale: string = DEFAULT_TAG): string {
  return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "long" });
}

export function formatNumber(value: number, locale: string = DEFAULT_TAG): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
}

/** Количество с единицей измерения; единица уже должна быть переведена. */
export function formatQuantity(value: number, unit: string, locale: string = DEFAULT_TAG): string {
  return `${formatNumber(value, locale)} ${unit}`;
}

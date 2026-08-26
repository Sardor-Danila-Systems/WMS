/**
 * Форматирование чисел, денег и дат. Принимает тег локали (`ru-RU`, `uz-UZ`) —
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

/**
 * Сумма в сумах. Копейки в накладных не встречаются, поэтому дробная часть
 * показывается только когда она действительно есть — иначе таблица сумм
 * превращается в частокол нулей.
 */
export function formatMoney(value: number, locale: string = DEFAULT_TAG): string {
  const fraction = Math.abs(value % 1) > 0.004 ? 2 : 0;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(value);
}

/** Сумма с обозначением валюты — для итогов и карточек. */
export function formatMoneyWithCurrency(
  value: number,
  currency: string,
  locale: string = DEFAULT_TAG
): string {
  return `${formatMoney(value, locale)} ${currency}`.trim();
}

/** Короткая запись больших сумм: 4 500 000 → «4,5 млн». */
export function formatMoneyCompact(
  value: number,
  suffixes: { thousand: string; million: string; billion: string },
  locale: string = DEFAULT_TAG
): string {
  const abs = Math.abs(value);
  const short = (divisor: number, suffix: string) =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / divisor)} ${suffix}`;

  if (abs >= 1_000_000_000) return short(1_000_000_000, suffixes.billion);
  if (abs >= 1_000_000) return short(1_000_000, suffixes.million);
  if (abs >= 10_000) return short(1_000, suffixes.thousand);
  return formatMoney(value, locale);
}

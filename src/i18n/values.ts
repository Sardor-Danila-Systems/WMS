"use client";

import { useTranslations } from "next-intl";

/**
 * Категории, единицы измерения и причины возврата хранятся в базе по-русски —
 * это их постоянные ключи. Здесь они переводятся для показа; если перевода
 * нет (например, категорию добавили позже), возвращается исходное значение,
 * чтобы данные не пропали с экрана.
 */
export function useValueTranslator(namespace: "units" | "categories" | "returnReasons") {
  const t = useTranslations(namespace);
  return (value: string | null | undefined): string => {
    if (!value) return "";
    // @ts-expect-error — ключ приходит из данных, а не из типа сообщений
    return t.has(value) ? (t(value) as string) : value;
  };
}

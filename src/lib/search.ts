/**
 * Поиск по таблицам склада.
 *
 * Запрос разбивается на слова, и строка подходит, только если найдено каждое
 * из них: «кабель 4» находит «ПВС 4*4 Андижан», а не всё подряд, где есть
 * четвёрка. Регистр и лишние пробелы не мешают, а кириллическая «ё»
 * приравнивается к «е» — в накладных её пишут как придётся.
 */
function normalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").trim();
}

export function searchTerms(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

export function matchesSearch(query: string, fields: (string | null | undefined | number)[]): boolean {
  const terms = searchTerms(query);
  if (terms.length === 0) return true;

  const haystack = normalize(
    fields.filter((value) => value !== null && value !== undefined && value !== "").join(" ")
  );
  return terms.every((term) => haystack.includes(term));
}

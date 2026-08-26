import type { MaterialCategory, Unit } from "@/types";

export interface MaterialSeed {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: Unit;
  minStock: number;
}

/**
 * Демонстрационная цена за единицу, в сумах. Порядок величин взят из реальных
 * накладных: мешок цемента — десятки тысяч, тонна арматуры — миллионы.
 */
export const DEMO_PRICE_BY_UNIT: Record<Unit, [number, number]> = {
  "шт": [2_000, 25_000],
  "кг": [8_000, 30_000],
  "метр": [15_000, 60_000],
  "комплект": [80_000, 600_000],
  "мешок": [35_000, 90_000],
  "м²": [40_000, 180_000],
  "м³": [180_000, 450_000],
  "т": [4_500_000, 9_500_000],
  "л": [25_000, 90_000],
  "рулон": [90_000, 350_000],
  "упаковка": [45_000, 250_000],
};

export const MATERIALS_SEED: MaterialSeed[] = [
  // Цемент и смеси
  { id: "mat-01", name: "Цемент М500", category: "Цемент и смеси", unit: "т", minStock: 8 },
  { id: "mat-02", name: "Цемент М400", category: "Цемент и смеси", unit: "т", minStock: 6 },
  { id: "mat-03", name: "Клей плиточный", category: "Цемент и смеси", unit: "упаковка", minStock: 120 },
  { id: "mat-04", name: "Штукатурка гипсовая", category: "Цемент и смеси", unit: "упаковка", minStock: 150 },
  { id: "mat-05", name: "Наливной пол", category: "Цемент и смеси", unit: "упаковка", minStock: 60 },

  // Металлопрокат
  { id: "mat-06", name: "Арматура 8 мм", category: "Металлопрокат", unit: "т", minStock: 4 },
  { id: "mat-07", name: "Арматура 12 мм", category: "Металлопрокат", unit: "т", minStock: 5 },
  { id: "mat-08", name: "Арматура 16 мм", category: "Металлопрокат", unit: "т", minStock: 3 },
  { id: "mat-09", name: "Труба профильная 40х20", category: "Металлопрокат", unit: "метр", minStock: 300 },
  { id: "mat-10", name: "Уголок стальной 50х50", category: "Металлопрокат", unit: "метр", minStock: 200 },
  { id: "mat-11", name: "Сетка кладочная", category: "Металлопрокат", unit: "рулон", minStock: 40 },

  // Нерудные материалы
  { id: "mat-12", name: "Щебень фракция 5-20", category: "Нерудные материалы", unit: "м³", minStock: 50 },
  { id: "mat-13", name: "Щебень фракция 20-40", category: "Нерудные материалы", unit: "м³", minStock: 40 },
  { id: "mat-14", name: "Песок речной", category: "Нерудные материалы", unit: "м³", minStock: 60 },
  { id: "mat-15", name: "Песок карьерный", category: "Нерудные материалы", unit: "м³", minStock: 45 },
  { id: "mat-16", name: "Гравий", category: "Нерудные материалы", unit: "м³", minStock: 35 },

  // Стеновые материалы
  { id: "mat-17", name: "Кирпич керамический одинарный", category: "Стеновые материалы", unit: "шт", minStock: 5000 },
  { id: "mat-18", name: "Кирпич силикатный", category: "Стеновые материалы", unit: "шт", minStock: 4000 },
  { id: "mat-19", name: "Блок газобетонный D500", category: "Стеновые материалы", unit: "шт", minStock: 800 },
  { id: "mat-20", name: "Блок керамзитобетонный", category: "Стеновые материалы", unit: "шт", minStock: 700 },

  // Лакокрасочные материалы
  { id: "mat-21", name: "Краска фасадная белая", category: "Лакокрасочные материалы", unit: "л", minStock: 200 },
  { id: "mat-22", name: "Краска интерьерная", category: "Лакокрасочные материалы", unit: "л", minStock: 180 },
  { id: "mat-23", name: "Грунтовка глубокого проникновения", category: "Лакокрасочные материалы", unit: "л", minStock: 250 },
  { id: "mat-24", name: "Эмаль ПФ-115", category: "Лакокрасочные материалы", unit: "л", minStock: 100 },
  { id: "mat-25", name: "Лак паркетный", category: "Лакокрасочные материалы", unit: "л", minStock: 60 },

  // Гипсокартон и профиль
  { id: "mat-26", name: "ГКЛ 12.5 мм", category: "Гипсокартон и профиль", unit: "шт", minStock: 300 },
  { id: "mat-27", name: "ГКЛВ влагостойкий", category: "Гипсокартон и профиль", unit: "шт", minStock: 150 },
  { id: "mat-28", name: "Профиль ПН 27х28", category: "Гипсокартон и профиль", unit: "шт", minStock: 400 },
  { id: "mat-29", name: "Профиль ПС 50х50", category: "Гипсокартон и профиль", unit: "шт", minStock: 400 },
  { id: "mat-30", name: "Лента армирующая", category: "Гипсокартон и профиль", unit: "рулон", minStock: 80 },

  // Пиломатериалы
  { id: "mat-31", name: "Доска обрезная 25х150", category: "Пиломатериалы", unit: "м³", minStock: 15 },
  { id: "mat-32", name: "Брус 100х100", category: "Пиломатериалы", unit: "м³", minStock: 10 },
  { id: "mat-33", name: "Фанера ФК 18 мм", category: "Пиломатериалы", unit: "шт", minStock: 120 },
  { id: "mat-34", name: "ОСБ плита 9 мм", category: "Пиломатериалы", unit: "шт", minStock: 150 },

  // Изоляция
  { id: "mat-35", name: "Минвата плита", category: "Изоляция", unit: "упаковка", minStock: 100 },
  { id: "mat-36", name: "Пенопласт ПСБ-25", category: "Изоляция", unit: "упаковка", minStock: 90 },
  { id: "mat-37", name: "Пеноплекс 50мм", category: "Изоляция", unit: "упаковка", minStock: 70 },
  { id: "mat-38", name: "Гидроизоляция рулонная", category: "Изоляция", unit: "рулон", minStock: 60 },

  // Крепёж
  { id: "mat-39", name: "Саморезы по металлу", category: "Крепёж", unit: "кг", minStock: 80 },
  { id: "mat-40", name: "Саморезы по дереву", category: "Крепёж", unit: "кг", minStock: 80 },
  { id: "mat-41", name: "Дюбель-гвоздь", category: "Крепёж", unit: "упаковка", minStock: 200 },
  { id: "mat-42", name: "Электроды сварочные", category: "Крепёж", unit: "кг", minStock: 50 },

  // Электрика и сантехника
  { id: "mat-43", name: "Кабель ВВГ 3х2.5", category: "Электрика и сантехника", unit: "метр", minStock: 500 },
  { id: "mat-44", name: "Труба ПВХ канализационная", category: "Электрика и сантехника", unit: "метр", minStock: 300 },
  { id: "mat-45", name: "Труба полипропиленовая", category: "Электрика и сантехника", unit: "метр", minStock: 400 },
];

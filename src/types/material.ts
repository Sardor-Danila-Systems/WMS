export type MaterialCategory =
  | "Цемент и смеси"
  | "Металлопрокат"
  | "Нерудные материалы"
  | "Стеновые материалы"
  | "Лакокрасочные материалы"
  | "Гипсокартон и профиль"
  | "Пиломатериалы"
  | "Изоляция"
  | "Крепёж"
  | "Электрика и сантехника";

export type Unit =
  | "шт"
  | "кг"
  | "метр"
  | "комплект"
  | "мешок"
  | "м²"
  | "м³"
  | "т"
  | "л"
  | "рулон"
  | "упаковка";

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  /** Остаток на складе. */
  quantity: number;
  /** Текущая цена за единицу. Меняется вручную и при каждом приходе. */
  price: number;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Дата последнего поступления, вычисляется из журнала движений. */
  lastReceiptDate: string | null;
  /** Сколько всего этого материала сейчас числится за блоками. */
  atBlocks: number;
}

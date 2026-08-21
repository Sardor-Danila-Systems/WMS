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

export type Unit = "т" | "м³" | "шт" | "кг" | "л" | "уп" | "м" | "м²" | "рулон";

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  /** Остаток на складе. */
  quantity: number;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Дата последнего поступления, вычисляется из журнала движений. */
  lastReceiptDate: string | null;
  /** Сколько всего этого материала сейчас на руках у бригадиров. */
  atForemen: number;
}

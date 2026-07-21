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
  category: MaterialCategory;
  unit: Unit;
  quantity: number;
  minStock: number;
  lastReceiptDate: string | null;
  createdAt: string;
}

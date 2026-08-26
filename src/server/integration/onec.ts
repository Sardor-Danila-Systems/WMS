import "@/lib/server-only";

/**
 * Подготовка к импорту данных из 1С.
 *
 * Живого подключения к 1С пока нет — для него нужны адрес опубликованной
 * базы, учётная запись и включённый OData/HTTP-сервис на стороне заказчика.
 * Здесь описан контракт, к которому этот импорт будет подключаться:
 *
 *   1. Каждая сущность 1С приходит со своим кодом (`Код`/`GUID`). Он
 *      сохраняется в поле `external_id` — по нему повторная загрузка находит
 *      уже заведённую запись и обновляет её, а не создаёт дубль.
 *   2. Документ поступления приходит шапкой + строками. Одна строка
 *      документа = одно движение в журнале, потому что журнал у нас
 *      построчный: у каждой строки своя цена и своя сумма.
 *   3. Повторная загрузка того же документа безопасна: `external_id`
 *      движения уникален, и вторая попытка будет отброшена базой.
 *
 * Соответствие полей описано в `docs/1c-import.md`.
 */

/** Номенклатура 1С → материал склада. */
export interface OneCItem {
  /** «Код» или GUID справочника «Номенклатура». */
  externalId: string;
  name: string;
  /** «Ед. изм.»: шт, кг, метр, комплект, мешок... */
  unit: string;
  category?: string;
  price?: number;
}

/** Контрагент 1С → поставщик. */
export interface OneCCounterparty {
  externalId: string;
  name: string;
  inn?: string;
  phone?: string;
}

/** Организация 1С → организация склада. */
export interface OneCOrganization {
  externalId: string;
  name: string;
  inn?: string;
  address?: string;
}

/** Строка документа «Поступление материалов». */
export interface OneCDocumentLine {
  /** Код номенклатуры — связывает строку с материалом. */
  itemExternalId: string;
  quantity: number;
  unitPrice: number;
  /** Сумма из 1С. Если не совпадёт с количеством × цена — считаем заново. */
  amount?: number;
}

/** Шапка документа «Поступление материалов» / «Реализация товаров». */
export interface OneCDocument {
  /** GUID документа в 1С — защита от повторной загрузки. */
  externalId: string;
  /** «Номер» документа — попадёт в номер фактуры. */
  number: string;
  /** Дата документа в ISO. */
  date: string;
  counterpartyExternalId?: string;
  organizationExternalId?: string;
  vehicleNumber?: string;
  paymentMethod?: "CASH" | "TRANSFER";
  comment?: string;
  lines: OneCDocumentLine[];
}

/** Что удалось разобрать из выгрузки 1С за один заход. */
export interface OneCPayload {
  items: OneCItem[];
  counterparties: OneCCounterparty[];
  organizations: OneCOrganization[];
  documents: OneCDocument[];
}

/** Итог загрузки — что создано, что обновлено, что пропущено и почему. */
export interface OneCImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { externalId: string; message: string }[];
}

/**
 * Нормализует единицу измерения 1С к нашему справочнику.
 * В 1С единицы пишут по-разному («шт.», «ШТ», «м», «пог.м») — без приведения
 * один и тот же материал заводился бы дважды.
 */
const UNIT_ALIASES: Record<string, string> = {
  "шт": "шт",
  "шт.": "шт",
  "штук": "шт",
  "кг": "кг",
  "кг.": "кг",
  "килограмм": "кг",
  "м": "метр",
  "м.": "метр",
  "метр": "метр",
  "пог.м": "метр",
  "п.м": "метр",
  "компл": "комплект",
  "компл.": "комплект",
  "комплект": "комплект",
  "меш": "мешок",
  "меш.": "мешок",
  "мешок": "мешок",
  "м2": "м²",
  "м²": "м²",
  "кв.м": "м²",
  "м3": "м³",
  "м³": "м³",
  "куб.м": "м³",
  "т": "т",
  "тонна": "т",
  "л": "л",
  "литр": "л",
  "рулон": "рулон",
  "уп": "упаковка",
  "уп.": "упаковка",
  "упак": "упаковка",
  "упаковка": "упаковка",
};

export function normalizeUnit(raw: string, fallback = "шт"): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "");
  return UNIT_ALIASES[key] ?? fallback;
}

/**
 * Сумма строки. 1С иногда присылает сумму с уже применённой скидкой —
 * если она расходится с «количество × цена» больше чем на сум, доверяем 1С:
 * в акте сверки должна сойтись именно её сумма.
 */
export function resolveLineAmount(line: OneCDocumentLine): number {
  const computed = line.quantity * line.unitPrice;
  if (line.amount === undefined) return computed;
  return Math.abs(line.amount - computed) > 1 ? line.amount : computed;
}

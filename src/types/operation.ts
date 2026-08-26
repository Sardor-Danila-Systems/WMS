/**
 * Типы движения материала. Замкнутый круг:
 * RECEIPT (приход: поставщик → склад) → ISSUE (расход: склад → блок)
 * → RETURN (возврат: блок → склад).
 */
export type MovementType = "RECEIPT" | "ISSUE" | "RETURN";

/** Способ оплаты из накладной: наличные или перечисление. */
export type PaymentMethod = "CASH" | "TRANSFER";

export type ReturnReason =
  | "Излишек на объекте"
  | "Брак/повреждение"
  | "Неверный материал"
  | "Отмена работ";

export interface StockMovement {
  id: string;
  type: MovementType;
  occurredAt: string;
  createdAt: string;

  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;

  /** Цена за единицу на момент операции и сумма строки (количество × цена). */
  unitPrice: number;
  amount: number;

  /** Сотрудник склада, проводивший операцию. */
  userId: string;
  userName: string;

  blockId: string | null;
  blockName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  organizationId: string | null;
  organizationName: string | null;

  invoiceNumber: string;
  vehicleNumber: string;
  paymentMethod: PaymentMethod | null;
  reason: string;
  comment: string;

  /** Как операция изменила остаток склада: +q, -q или 0. */
  warehouseDelta: number;
  /** Как операция изменила количество, числящееся за блоком. */
  blockDelta: number;
  /** Остаток склада сразу после операции — «фотография» на момент записи. */
  warehouseAfter: number;
  blockAfter: number | null;
}

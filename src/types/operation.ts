/**
 * Типы движения материала. Замкнутый цикл:
 * RECEIPT (поставщик → склад) → ISSUE (склад → бригадир)
 * → USAGE (бригадир → стройка) / RETURN (бригадир → склад).
 */
export type MovementType = "RECEIPT" | "ISSUE" | "USAGE" | "RETURN";

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

  /** Сотрудник склада, проводивший операцию. */
  userId: string;
  userName: string;

  foremanId: string | null;
  foremanName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  projectId: string | null;
  projectName: string | null;

  vehicleNumber: string;
  reason: string;
  comment: string;

  /** Как операция изменила остаток склада: +q, -q или 0. */
  warehouseDelta: number;
  /** Как операция изменила остаток у бригадира. */
  foremanDelta: number;
  /** Остаток склада сразу после операции — «фотография» на момент записи. */
  warehouseAfter: number;
  foremanAfter: number | null;
}

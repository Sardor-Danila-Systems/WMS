import "@/lib/server-only";

import { db, transaction, type Tx } from "@/lib/db/client";
import { roundQty } from "@/lib/validation";
import type { MovementType } from "@/types";
import { BusinessError } from "./errors";

export interface RecordMovementInput {
  type: MovementType;
  materialId: string;
  quantity: number;
  /** Сотрудник склада, проводящий операцию. */
  userId: string;
  occurredAt: string;
  foremanId?: string | null;
  supplierId?: string | null;
  projectId?: string | null;
  vehicleNumber?: string;
  reason?: string;
  comment?: string;
}

/**
 * Как каждый тип операции меняет два остатка.
 * Склад и бригадир всегда меняются согласованно, поэтому таблица — единственное
 * место, где задаётся направление движения.
 */
const DELTAS: Record<MovementType, { warehouse: 1 | -1 | 0; foreman: 1 | -1 | 0; needsForeman: boolean }> = {
  RECEIPT: { warehouse: 1, foreman: 0, needsForeman: false },
  ISSUE: { warehouse: -1, foreman: 1, needsForeman: true },
  USAGE: { warehouse: 0, foreman: -1, needsForeman: true },
  RETURN: { warehouse: 1, foreman: -1, needsForeman: true },
};

export function recordMovement(input: RecordMovementInput): Promise<{ movementId: string }> {
  return transaction((tx) => recordMovementInTx(tx, input));
}

/**
 * Единая точка записи любого движения материала.
 *
 * Всё выполняется в одной транзакции: строка материала блокируется через
 * SELECT ... FOR UPDATE, поэтому проверка «хватает ли материала» и последующее
 * списание не могут разъехаться между двумя одновременными операциями —
 * двойная выдача исключена. Любая ошибка откатывает операцию целиком,
 * и в базе не остаётся ни изменённого остатка, ни висячей записи движения.
 *
 * Вызывать только внутри `transaction()`.
 */
export async function recordMovementInTx(
  tx: Tx,
  input: RecordMovementInput
): Promise<{ movementId: string }> {
  const rules = DELTAS[input.type];

  const quantity = roundQty(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new BusinessError("QUANTITY_POSITIVE", { field: "quantity" });
  }

  const occurred = new Date(input.occurredAt);
  if (Number.isNaN(occurred.getTime())) {
    throw new BusinessError("DATE_INVALID", { field: "occurredAt" });
  }

  const foremanId = input.foremanId?.trim() || null;
  if (rules.needsForeman && !foremanId) {
    throw new BusinessError("FOREMAN_REQUIRED", { field: "foremanId" });
  }

  // FOR UPDATE блокирует строку материала до конца транзакции: параллельная
  // операция дождётся коммита и увидит уже уменьшенный остаток.
  const locked = await tx.$queryRaw<{ id: string; name: string; unit: string; quantity: number; is_active: boolean }[]>`
    SELECT id, name, unit, quantity, is_active FROM materials WHERE id = ${input.materialId} FOR UPDATE
  `;
  const material = locked[0];

  if (!material) throw new BusinessError("MATERIAL_NOT_FOUND", { field: "materialId" });
  if (!material.is_active) {
    throw new BusinessError("MATERIAL_ARCHIVED", { field: "materialId" });
  }

  if (foremanId) {
    const foreman = await tx.foreman.findUnique({
      where: { id: foremanId },
      select: { id: true, isActive: true },
    });
    if (!foreman) throw new BusinessError("FOREMAN_NOT_FOUND", { field: "foremanId" });
    if (!foreman.isActive) {
      throw new BusinessError("FOREMAN_INACTIVE", { field: "foremanId" });
    }
  }

  const warehouseDelta = roundQty(quantity * rules.warehouse);
  const foremanDelta = roundQty(quantity * rules.foreman);

  // --- Проверка склада -------------------------------------------------
  const warehouseAfter = roundQty(material.quantity + warehouseDelta);
  if (warehouseAfter < 0) {
    throw new BusinessError("INSUFFICIENT_STOCK", {
      field: "quantity",
      amount: { value: material.quantity, unit: material.unit },
    });
  }

  // --- Проверка остатка у бригадира ------------------------------------
  let foremanAfter: number | null = null;
  let foremanBefore = 0;
  if (foremanId) {
    const held = await tx.$queryRaw<{ quantity: number }[]>`
      SELECT quantity FROM foreman_stock
       WHERE foreman_id = ${foremanId} AND material_id = ${material.id}
       FOR UPDATE
    `;
    foremanBefore = held[0]?.quantity ?? 0;
    foremanAfter = roundQty(foremanBefore + foremanDelta);

    if (foremanAfter < 0) {
      throw new BusinessError(
        input.type === "RETURN"
          ? "INSUFFICIENT_FOREMAN_STOCK_RETURN"
          : "INSUFFICIENT_FOREMAN_STOCK_USAGE",
        { field: "quantity", amount: { value: foremanBefore, unit: material.unit } }
      );
    }
  }

  // --- Запись движения (журнал пишется всегда) -------------------------
  const movement = await tx.stockMovement.create({
    data: {
      type: input.type,
      materialId: material.id,
      quantity,
      occurredAt: occurred,
      userId: input.userId,
      foremanId,
      supplierId: input.supplierId?.trim() || null,
      projectId: input.projectId?.trim() || null,
      vehicleNumber: input.vehicleNumber?.trim() ?? "",
      reason: input.reason?.trim() ?? "",
      comment: input.comment?.trim() ?? "",
      warehouseDelta,
      foremanDelta,
      warehouseAfter,
      foremanAfter,
    },
    select: { id: true },
  });

  // --- Обновление остатков ---------------------------------------------
  if (warehouseDelta !== 0) {
    await tx.material.update({
      where: { id: material.id },
      data: { quantity: warehouseAfter },
    });
  }

  if (foremanId && foremanDelta !== 0) {
    await tx.foremanStock.upsert({
      where: { foremanId_materialId: { foremanId, materialId: material.id } },
      create: { foremanId, materialId: material.id, quantity: foremanAfter! },
      update: { quantity: foremanAfter! },
    });
  }

  return { movementId: movement.id };
}

/**
 * Пересчитывает остатки заново из журнала движений и сравнивает с сохранёнными.
 * Используется для проверки целостности — журнал первичен, остатки вторичны.
 */
export async function verifyLedgerConsistency(): Promise<{
  ok: boolean;
  materialMismatches: { id: string; name: string; stored: number; computed: number }[];
  foremanMismatches: { foremanId: string; materialId: string; stored: number; computed: number }[];
}> {
  const materialMismatches = await db.$queryRaw<
    { id: string; name: string; stored: number; computed: number }[]
  >`
    SELECT m.id, m.name, m.quantity AS stored,
           COALESCE((SELECT SUM(warehouse_delta) FROM stock_movements WHERE material_id = m.id), 0) AS computed
      FROM materials m
     WHERE ABS(m.quantity - COALESCE((SELECT SUM(warehouse_delta) FROM stock_movements WHERE material_id = m.id), 0)) > 0.0005
  `;

  const foremanMismatches = await db.$queryRaw<
    { foremanId: string; materialId: string; stored: number; computed: number }[]
  >`
    SELECT fs.foreman_id AS "foremanId", fs.material_id AS "materialId", fs.quantity AS stored,
           COALESCE((SELECT SUM(foreman_delta) FROM stock_movements sm
                      WHERE sm.foreman_id = fs.foreman_id AND sm.material_id = fs.material_id), 0) AS computed
      FROM foreman_stock fs
     WHERE ABS(fs.quantity - COALESCE((SELECT SUM(foreman_delta) FROM stock_movements sm
                      WHERE sm.foreman_id = fs.foreman_id AND sm.material_id = fs.material_id), 0)) > 0.0005
  `;

  return {
    ok: materialMismatches.length === 0 && foremanMismatches.length === 0,
    materialMismatches,
    foremanMismatches,
  };
}

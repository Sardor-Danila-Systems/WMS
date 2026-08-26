import "@/lib/server-only";

import { db, transaction, type Tx } from "@/lib/db/client";
import { roundMoney, roundQty } from "@/lib/validation";
import type { MovementType, PaymentMethod } from "@/types";
import { BusinessError } from "./errors";

export interface RecordMovementInput {
  type: MovementType;
  materialId: string;
  quantity: number;
  /** Цена за единицу. Не задана — берётся текущая цена материала. */
  unitPrice?: number | null;
  /** Сотрудник склада, проводящий операцию. */
  userId: string;
  occurredAt: string;
  blockId?: string | null;
  supplierId?: string | null;
  organizationId?: string | null;
  invoiceNumber?: string;
  vehicleNumber?: string;
  paymentMethod?: PaymentMethod | null;
  reason?: string;
  comment?: string;
  /** Идентификатор документа-источника в 1С — защита от повторного импорта. */
  externalId?: string | null;
}

/**
 * Как каждый тип операции меняет два остатка.
 * Склад и блок всегда меняются согласованно, поэтому таблица — единственное
 * место, где задаётся направление движения.
 */
const DELTAS: Record<MovementType, { warehouse: 1 | -1 | 0; block: 1 | -1 | 0; needsBlock: boolean }> = {
  RECEIPT: { warehouse: 1, block: 0, needsBlock: false },
  ISSUE: { warehouse: -1, block: 1, needsBlock: true },
  RETURN: { warehouse: 1, block: -1, needsBlock: true },
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

  const blockId = input.blockId?.trim() || null;
  if (rules.needsBlock && !blockId) {
    throw new BusinessError("BLOCK_REQUIRED", { field: "blockId" });
  }

  // FOR UPDATE блокирует строку материала до конца транзакции: параллельная
  // операция дождётся коммита и увидит уже уменьшенный остаток.
  const locked = await tx.$queryRaw<
    { id: string; name: string; unit: string; quantity: number; price: number; is_active: boolean }[]
  >`
    SELECT id, name, unit, quantity, price, is_active FROM materials WHERE id = ${input.materialId} FOR UPDATE
  `;
  const material = locked[0];

  if (!material) throw new BusinessError("MATERIAL_NOT_FOUND", { field: "materialId" });
  if (!material.is_active) {
    throw new BusinessError("MATERIAL_ARCHIVED", { field: "materialId" });
  }

  if (blockId) {
    const block = await tx.block.findUnique({
      where: { id: blockId },
      select: { id: true, isActive: true },
    });
    if (!block) throw new BusinessError("BLOCK_NOT_FOUND", { field: "blockId" });
    if (!block.isActive) {
      throw new BusinessError("BLOCK_INACTIVE", { field: "blockId" });
    }
  }

  // --- Цена и сумма ----------------------------------------------------
  // Цена не задана — подставляем её сами, чтобы сумма в журнале была
  // осмысленной даже когда оператор её не вводил.
  //
  // Возврат оценивается по цене, по которой материал уходил в этот блок,
  // а не по сегодняшней: иначе подорожавший материал возвращался бы дороже,
  // чем выдавался, и расход блока в деньгах уходил бы в минус.
  let defaultPrice = material.price;
  if (input.type === "RETURN" && blockId) {
    const lastIssue = await tx.$queryRaw<{ unit_price: number }[]>`
      SELECT unit_price FROM stock_movements
       WHERE type = 'ISSUE' AND block_id = ${blockId} AND material_id = ${material.id}
         AND unit_price > 0
       ORDER BY occurred_at DESC, seq DESC
       LIMIT 1
    `;
    if (lastIssue[0]) defaultPrice = lastIssue[0].unit_price;
  }

  const rawPrice = input.unitPrice ?? defaultPrice;
  const unitPrice = roundMoney(Number(rawPrice) || 0);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new BusinessError("PRICE_NEGATIVE", { field: "unitPrice" });
  }
  const amount = roundMoney(quantity * unitPrice);

  const warehouseDelta = roundQty(quantity * rules.warehouse);
  const blockDelta = roundQty(quantity * rules.block);

  // --- Проверка склада -------------------------------------------------
  const warehouseAfter = roundQty(material.quantity + warehouseDelta);
  if (warehouseAfter < 0) {
    throw new BusinessError("INSUFFICIENT_STOCK", {
      field: "quantity",
      amount: { value: material.quantity, unit: material.unit },
    });
  }

  // --- Проверка количества, числящегося за блоком ----------------------
  let blockAfter: number | null = null;
  if (blockId) {
    const held = await tx.$queryRaw<{ quantity: number }[]>`
      SELECT quantity FROM block_stock
       WHERE block_id = ${blockId} AND material_id = ${material.id}
       FOR UPDATE
    `;
    const blockBefore = held[0]?.quantity ?? 0;
    blockAfter = roundQty(blockBefore + blockDelta);

    if (blockAfter < 0) {
      throw new BusinessError("INSUFFICIENT_BLOCK_STOCK", {
        field: "quantity",
        amount: { value: blockBefore, unit: material.unit },
      });
    }
  }

  // --- Запись движения (журнал пишется всегда) -------------------------
  const movement = await tx.stockMovement.create({
    data: {
      type: input.type,
      materialId: material.id,
      quantity,
      unitPrice,
      amount,
      occurredAt: occurred,
      userId: input.userId,
      blockId,
      supplierId: input.supplierId?.trim() || null,
      organizationId: input.organizationId?.trim() || null,
      invoiceNumber: input.invoiceNumber?.trim() ?? "",
      vehicleNumber: input.vehicleNumber?.trim() ?? "",
      paymentMethod: input.paymentMethod ?? null,
      reason: input.reason?.trim() ?? "",
      comment: input.comment?.trim() ?? "",
      externalId: input.externalId?.trim() || null,
      warehouseDelta,
      blockDelta,
      warehouseAfter,
      blockAfter,
    },
    select: { id: true },
  });

  // --- Обновление остатков ---------------------------------------------
  // Приход с новой ценой обновляет текущую цену материала: последняя закупка
  // и есть актуальная цена. Уже записанные движения при этом не меняются —
  // их сумма зафиксирована в журнале.
  const priceChanged = input.type === "RECEIPT" && unitPrice > 0 && unitPrice !== material.price;

  if (warehouseDelta !== 0 || priceChanged) {
    await tx.material.update({
      where: { id: material.id },
      data: {
        ...(warehouseDelta !== 0 ? { quantity: warehouseAfter } : {}),
        ...(priceChanged ? { price: unitPrice } : {}),
      },
    });
  }

  if (blockId && blockDelta !== 0) {
    await tx.blockStock.upsert({
      where: { blockId_materialId: { blockId, materialId: material.id } },
      create: { blockId, materialId: material.id, quantity: blockAfter! },
      update: { quantity: blockAfter! },
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
  blockMismatches: { blockId: string; materialId: string; stored: number; computed: number }[];
}> {
  const materialMismatches = await db.$queryRaw<
    { id: string; name: string; stored: number; computed: number }[]
  >`
    SELECT m.id, m.name, m.quantity AS stored,
           COALESCE((SELECT SUM(warehouse_delta) FROM stock_movements WHERE material_id = m.id), 0) AS computed
      FROM materials m
     WHERE ABS(m.quantity - COALESCE((SELECT SUM(warehouse_delta) FROM stock_movements WHERE material_id = m.id), 0)) > 0.0005
  `;

  const blockMismatches = await db.$queryRaw<
    { blockId: string; materialId: string; stored: number; computed: number }[]
  >`
    SELECT bs.block_id AS "blockId", bs.material_id AS "materialId", bs.quantity AS stored,
           COALESCE((SELECT SUM(block_delta) FROM stock_movements sm
                      WHERE sm.block_id = bs.block_id AND sm.material_id = bs.material_id), 0) AS computed
      FROM block_stock bs
     WHERE ABS(bs.quantity - COALESCE((SELECT SUM(block_delta) FROM stock_movements sm
                      WHERE sm.block_id = bs.block_id AND sm.material_id = bs.material_id), 0)) > 0.0005
  `;

  return {
    ok: materialMismatches.length === 0 && blockMismatches.length === 0,
    materialMismatches,
    blockMismatches,
  };
}

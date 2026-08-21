import "@/lib/server-only";

import { randomUUID } from "node:crypto";

import { getDb, queryAll, queryOne, transaction } from "@/lib/db/client";
import { roundQty } from "@/lib/validation";
import { formatNumber } from "@/lib/format";
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

interface MaterialRow {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  is_active: number;
}

/**
 * Единая точка записи любого движения материала.
 *
 * Всё выполняется в одной транзакции (BEGIN IMMEDIATE): остатки читаются уже
 * под блокировкой записи, поэтому проверка «хватает ли материала» и последующее
 * списание не могут разъехаться между двумя одновременными операциями —
 * двойная выдача исключена. Любая ошибка откатывает операцию целиком,
 * и в базе не остаётся ни изменённого остатка, ни висячей записи движения.
 */
export function recordMovement(input: RecordMovementInput): { movementId: string } {
  return transaction(() => recordMovementInTx(input));
}

/**
 * Тело операции без открытия транзакции — чтобы её можно было выполнить
 * внутри уже начатой (например, «создать материал + записать начальный остаток»
 * должно быть одной неделимой операцией).
 * Вызывать только внутри `transaction()`.
 */
export function recordMovementInTx(input: RecordMovementInput): { movementId: string } {
  const db = getDb();
  const rules = DELTAS[input.type];

  const quantity = roundQty(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new BusinessError("Количество должно быть больше 0", "quantity");
  }

  const occurred = new Date(input.occurredAt);
  if (Number.isNaN(occurred.getTime())) {
    throw new BusinessError("Некорректная дата операции", "occurredAt");
  }

  const foremanId = input.foremanId?.trim() || null;
  if (rules.needsForeman && !foremanId) {
    throw new BusinessError("Выберите бригадира", "foremanId");
  }

  {
    const material = queryOne<MaterialRow>(
      "SELECT id, name, unit, quantity, is_active FROM materials WHERE id = ?",
      input.materialId
    );

    if (!material) throw new BusinessError("Материал не найден", "materialId");
    if (material.is_active !== 1) {
      throw new BusinessError("Материал архивирован, операции по нему запрещены", "materialId");
    }

    if (foremanId) {
      const foreman = queryOne<{ id: string; is_active: number }>(
        "SELECT id, is_active FROM foremen WHERE id = ?",
        foremanId
      );
      if (!foreman) throw new BusinessError("Бригадир не найден", "foremanId");
      if (foreman.is_active !== 1) {
        throw new BusinessError("Бригадир неактивен, операции по нему запрещены", "foremanId");
      }
    }

    const warehouseDelta = roundQty(quantity * rules.warehouse);
    const foremanDelta = roundQty(quantity * rules.foreman);

    // --- Проверка склада -------------------------------------------------
    const warehouseAfter = roundQty(material.quantity + warehouseDelta);
    if (warehouseAfter < 0) {
      throw new BusinessError(
        `Недостаточно материала на складе. Доступно: ${formatNumber(material.quantity)} ${material.unit}`,
        "quantity"
      );
    }

    // --- Проверка остатка у бригадира ------------------------------------
    let foremanAfter: number | null = null;
    if (foremanId) {
      const current = queryOne<{ quantity: number }>(
        "SELECT quantity FROM foreman_stock WHERE foreman_id = ? AND material_id = ?",
        foremanId,
        material.id
      );
      const foremanBefore = current?.quantity ?? 0;
      foremanAfter = roundQty(foremanBefore + foremanDelta);

      if (foremanAfter < 0) {
        const verb = input.type === "RETURN" ? "вернуть" : "списать";
        throw new BusinessError(
          `Нельзя ${verb} больше, чем числится за бригадиром. На руках: ${formatNumber(foremanBefore)} ${material.unit}`,
          "quantity"
        );
      }
    }

    const now = new Date().toISOString();

    // --- Запись движения (журнал пишется всегда) -------------------------
    const movementId = randomUUID();
    db.prepare(
      `INSERT INTO stock_movements (
         id, type, material_id, quantity, occurred_at, created_at,
         user_id, foreman_id, supplier_id, project_id,
         vehicle_number, reason, comment,
         warehouse_delta, foreman_delta, warehouse_after, foreman_after
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      movementId,
      input.type,
      material.id,
      quantity,
      occurred.toISOString(),
      now,
      input.userId,
      foremanId,
      input.supplierId?.trim() || null,
      input.projectId?.trim() || null,
      input.vehicleNumber?.trim() ?? "",
      input.reason?.trim() ?? "",
      input.comment?.trim() ?? "",
      warehouseDelta,
      foremanDelta,
      warehouseAfter,
      foremanAfter
    );

    // --- Обновление остатков ---------------------------------------------
    if (warehouseDelta !== 0) {
      db.prepare("UPDATE materials SET quantity = ?, updated_at = ? WHERE id = ?").run(
        warehouseAfter,
        now,
        material.id
      );
    }

    if (foremanId && foremanDelta !== 0) {
      db.prepare(
        `INSERT INTO foreman_stock (foreman_id, material_id, quantity, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (foreman_id, material_id)
         DO UPDATE SET quantity = excluded.quantity, updated_at = excluded.updated_at`
      ).run(foremanId, material.id, foremanAfter, now);
    }

    return { movementId };
  }
}

/**
 * Пересчитывает остатки заново из журнала движений и сравнивает с сохранёнными.
 * Используется для проверки целостности — журнал первичен, остатки вторичны.
 */
export function verifyLedgerConsistency(): {
  ok: boolean;
  materialMismatches: { id: string; name: string; stored: number; computed: number }[];
  foremanMismatches: { foremanId: string; materialId: string; stored: number; computed: number }[];
} {
  const materialMismatches = queryAll<{ id: string; name: string; stored: number; computed: number }>(
    `SELECT m.id, m.name, m.quantity AS stored,
              ROUND(COALESCE((SELECT SUM(warehouse_delta) FROM stock_movements WHERE material_id = m.id), 0), 3) AS computed
         FROM materials m
      WHERE ABS(m.quantity - COALESCE((SELECT SUM(warehouse_delta) FROM stock_movements WHERE material_id = m.id), 0)) > 0.0005`
  );

  const foremanMismatches = queryAll<{ foremanId: string; materialId: string; stored: number; computed: number }>(
    `SELECT fs.foreman_id AS foremanId, fs.material_id AS materialId, fs.quantity AS stored,
              ROUND(COALESCE((SELECT SUM(foreman_delta) FROM stock_movements sm
                               WHERE sm.foreman_id = fs.foreman_id AND sm.material_id = fs.material_id), 0), 3) AS computed
         FROM foreman_stock fs
        WHERE ABS(fs.quantity - COALESCE((SELECT SUM(foreman_delta) FROM stock_movements sm
                             WHERE sm.foreman_id = fs.foreman_id AND sm.material_id = fs.material_id), 0)) > 0.0005`
  );

  return {
    ok: materialMismatches.length === 0 && foremanMismatches.length === 0,
    materialMismatches,
    foremanMismatches,
  };
}

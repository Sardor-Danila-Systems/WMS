import "@/lib/server-only";

import { cache } from "react";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { getStockStatus } from "@/constants/colors";
import type {
  Block,
  BlockStockRow,
  Material,
  MovementType,
  Organization,
  StockMovement,
  Supplier,
  User,
} from "@/types";

/**
 * Справочники обёрнуты в `cache()`: за один проход рендера их запрашивают
 * несколько компонентов сразу (например, дашборд и формы операций), и без
 * этого один и тот же список материалов уезжал бы в базу дважды. До облачной
 * базы каждый лишний запрос — это ещё один круг по сети.
 *
 * Простые выборки идут через модели Prisma, сводные отчёты — через $queryRaw:
 * агрегаты вида «сумма по типу операции в разрезе материала» в SQL выражаются
 * одним запросом, а через конструктор запросов превратились бы в несколько
 * обращений к базе и склейку в памяти.
 */

const iso = (date: Date): string => date.toISOString();

/* ------------------------------------------------------------------ */
/* Материалы                                                           */
/* ------------------------------------------------------------------ */

interface MaterialAggregateRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  price: number;
  min_stock: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_receipt: Date | null;
  at_blocks: number;
}

function mapMaterial(row: MaterialAggregateRow): Material {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantity: row.quantity,
    price: row.price,
    minStock: row.min_stock,
    isActive: row.is_active,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    lastReceiptDate: row.last_receipt ? iso(row.last_receipt) : null,
    atBlocks: row.at_blocks,
  };
}

export const listMaterials = cache(async function listMaterials(options?: { includeArchived?: boolean }): Promise<Material[]> {
  const rows = await db.$queryRaw<MaterialAggregateRow[]>`
    SELECT m.*,
           (SELECT MAX(occurred_at) FROM stock_movements
             WHERE material_id = m.id AND type = 'RECEIPT') AS last_receipt,
           COALESCE((SELECT SUM(quantity) FROM block_stock WHERE material_id = m.id), 0) AS at_blocks
      FROM materials m
     WHERE ${options?.includeArchived ? Prisma.sql`TRUE` : Prisma.sql`m.is_active`}
     ORDER BY lower(m.name)
  `;
  return rows.map(mapMaterial);
});

export async function getMaterial(id: string): Promise<Material | null> {
  const rows = await db.$queryRaw<MaterialAggregateRow[]>`
    SELECT m.*,
           (SELECT MAX(occurred_at) FROM stock_movements
             WHERE material_id = m.id AND type = 'RECEIPT') AS last_receipt,
           COALESCE((SELECT SUM(quantity) FROM block_stock WHERE material_id = m.id), 0) AS at_blocks
      FROM materials m
     WHERE m.id = ${id}
  `;
  return rows[0] ? mapMaterial(rows[0]) : null;
}

/** Сколько раз материал встречается в журнале — материал с историей удалять нельзя. */
export function countMaterialMovements(materialId: string): Promise<number> {
  return db.stockMovement.count({ where: { materialId } });
}

/* ------------------------------------------------------------------ */
/* Движения                                                            */
/* ------------------------------------------------------------------ */

const MOVEMENT_INCLUDE = {
  material: { select: { name: true, unit: true } },
  user: { select: { fullName: true } },
  block: { select: { name: true } },
  supplier: { select: { name: true } },
  organization: { select: { name: true } },
} satisfies Prisma.StockMovementInclude;

type MovementWithRelations = Prisma.StockMovementGetPayload<{ include: typeof MOVEMENT_INCLUDE }>;

function mapMovement(row: MovementWithRelations): StockMovement {
  return {
    id: row.id,
    type: row.type,
    occurredAt: iso(row.occurredAt),
    createdAt: iso(row.createdAt),
    materialId: row.materialId,
    materialName: row.material.name,
    unit: row.material.unit,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    amount: row.amount,
    userId: row.userId,
    userName: row.user.fullName,
    blockId: row.blockId,
    blockName: row.block?.name ?? null,
    supplierId: row.supplierId,
    supplierName: row.supplier?.name ?? null,
    organizationId: row.organizationId,
    organizationName: row.organization?.name ?? null,
    invoiceNumber: row.invoiceNumber,
    vehicleNumber: row.vehicleNumber,
    paymentMethod: row.paymentMethod,
    reason: row.reason,
    comment: row.comment,
    warehouseDelta: row.warehouseDelta,
    blockDelta: row.blockDelta,
    warehouseAfter: row.warehouseAfter,
    blockAfter: row.blockAfter,
  };
}

export interface MovementFilters {
  type?: MovementType | "all";
  materialId?: string;
  blockId?: string;
  userId?: string;
  organizationId?: string;
  supplierId?: string;
  /** ISO-дата начала периода включительно. */
  from?: string;
  /** ISO-дата конца периода включительно. */
  to?: string;
  search?: string;
  limit?: number;
}

export async function listMovements(filters: MovementFilters = {}): Promise<StockMovement[]> {
  const pick = (value?: string) => (value && value !== "all" ? value : undefined);

  const where: Prisma.StockMovementWhereInput = {
    type: filters.type && filters.type !== "all" ? filters.type : undefined,
    materialId: pick(filters.materialId),
    blockId: pick(filters.blockId),
    userId: pick(filters.userId),
    organizationId: pick(filters.organizationId),
    supplierId: pick(filters.supplierId),
    occurredAt:
      filters.from || filters.to
        ? { gte: filters.from ? new Date(filters.from) : undefined, lte: filters.to ? new Date(filters.to) : undefined }
        : undefined,
  };

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { material: { name: { contains: term, mode: "insensitive" } } },
      { user: { fullName: { contains: term, mode: "insensitive" } } },
      { block: { name: { contains: term, mode: "insensitive" } } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
      { organization: { name: { contains: term, mode: "insensitive" } } },
      { comment: { contains: term, mode: "insensitive" } },
      { invoiceNumber: { contains: term, mode: "insensitive" } },
      { vehicleNumber: { contains: term, mode: "insensitive" } },
    ];
  }

  const rows = await db.stockMovement.findMany({
    where,
    include: MOVEMENT_INCLUDE,
    // seq — порядок записи: у нескольких операций одного дня может совпадать
    // время, и без него история показывалась бы вразнобой.
    orderBy: [{ occurredAt: "desc" }, { seq: "desc" }],
    take: filters.limit,
  });

  return rows.map(mapMovement);
}

/* ------------------------------------------------------------------ */
/* Блоки                                                               */
/* ------------------------------------------------------------------ */

type BlockWithOrganization = Prisma.BlockGetPayload<{
  include: { organization: { select: { name: true } } };
}>;

function mapBlock(row: BlockWithOrganization): Block {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    organizationId: row.organizationId,
    organizationName: row.organization?.name ?? null,
    isActive: row.isActive,
    createdAt: iso(row.createdAt),
  };
}

export const listBlocks = cache(async function listBlocks(options?: { includeInactive?: boolean }): Promise<Block[]> {
  const rows = await db.block.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    include: { organization: { select: { name: true } } },
    // Блоки идут как на площадке — A, B, C, D, E, а не по алфавиту базы.
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(mapBlock);
});

export async function getBlock(id: string): Promise<Block | null> {
  const row = await db.block.findUnique({
    where: { id },
    include: { organization: { select: { name: true } } },
  });
  return row ? mapBlock(row) : null;
}

/** Что прямо сейчас числится за блоком (только ненулевые позиции). */
export async function getBlockStock(blockId: string): Promise<BlockStockRow[]> {
  const rows = await db.blockStock.findMany({
    where: { blockId, quantity: { gt: 0 } },
    include: { material: { select: { name: true, unit: true } } },
    orderBy: { material: { name: "asc" } },
  });
  return rows.map((row) => ({
    blockId: row.blockId,
    materialId: row.materialId,
    materialName: row.material.name,
    unit: row.material.unit,
    quantity: row.quantity,
    updatedAt: iso(row.updatedAt),
  }));
}

export interface BlockMaterialTotal {
  materialId: string;
  materialName: string;
  unit: string;
  issued: number;
  returned: number;
  onHand: number;
  amount: number;
}

/**
 * По каждому материалу: сколько ушло в блок, сколько вернулось, сколько
 * числится и на какую сумму. Каждая строка — один материал со своей единицей
 * измерения, поэтому количества сопоставимы; суммы складываются в деньгах.
 */
export function getBlockMaterialTotals(blockId: string): Promise<BlockMaterialTotal[]> {
  return db.$queryRaw<BlockMaterialTotal[]>`
    SELECT sm.material_id AS "materialId", m.name AS "materialName", m.unit,
           COALESCE(SUM(CASE WHEN sm.type = 'ISSUE'  THEN sm.quantity END), 0) AS issued,
           COALESCE(SUM(CASE WHEN sm.type = 'RETURN' THEN sm.quantity END), 0) AS returned,
           COALESCE((SELECT bs.quantity FROM block_stock bs
                      WHERE bs.block_id = sm.block_id AND bs.material_id = sm.material_id), 0) AS "onHand",
           COALESCE(SUM(CASE WHEN sm.type = 'ISSUE'  THEN sm.amount END), 0)
             - COALESCE(SUM(CASE WHEN sm.type = 'RETURN' THEN sm.amount END), 0) AS amount
      FROM stock_movements sm
      JOIN materials m ON m.id = sm.material_id
     WHERE sm.block_id = ${blockId}
     GROUP BY sm.material_id, sm.block_id, m.name, m.unit
     ORDER BY "onHand" DESC, lower(m.name)
  `;
}

/**
 * Сводка по блоку считается в количестве операций и в деньгах, а не в сумме
 * количеств: складывать тонны арматуры со штуками кирпича бессмысленно.
 */
export interface BlockSummary {
  blockId: string;
  positions: number;
  issueCount: number;
  returnCount: number;
  amount: number;
  lastOperationAt: string | null;
}

export const getBlockSummaries = cache(async function getBlockSummaries(): Promise<Map<string, BlockSummary>> {
  const rows = await db.$queryRaw<
    (Omit<BlockSummary, "lastOperationAt"> & { lastOperationAt: Date | null })[]
  >`
    SELECT b.id AS "blockId",
           (SELECT COUNT(*)::int FROM block_stock bs WHERE bs.block_id = b.id AND bs.quantity > 0) AS positions,
           (SELECT COUNT(*)::int FROM stock_movements WHERE block_id = b.id AND type = 'ISSUE')  AS "issueCount",
           (SELECT COUNT(*)::int FROM stock_movements WHERE block_id = b.id AND type = 'RETURN') AS "returnCount",
           COALESCE((SELECT SUM(amount) FILTER (WHERE type = 'ISSUE')
                            - COALESCE(SUM(amount) FILTER (WHERE type = 'RETURN'), 0)
                       FROM stock_movements WHERE block_id = b.id), 0) AS amount,
           (SELECT MAX(occurred_at) FROM stock_movements WHERE block_id = b.id) AS "lastOperationAt"
      FROM blocks b
  `;
  return new Map(
    rows.map((r) => [
      r.blockId,
      { ...r, lastOperationAt: r.lastOperationAt ? iso(r.lastOperationAt) : null },
    ])
  );
});

/* ------------------------------------------------------------------ */
/* Справочники                                                         */
/* ------------------------------------------------------------------ */

export const listOrganizations = cache(async function listOrganizations(options?: { includeInactive?: boolean }): Promise<Organization[]> {
  const rows = await db.organization.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    inn: r.inn,
    phone: r.phone,
    isActive: r.isActive,
    createdAt: iso(r.createdAt),
  }));
});

export async function getOrganization(id: string): Promise<Organization | null> {
  const row = await db.organization.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    inn: row.inn,
    phone: row.phone,
    isActive: row.isActive,
    createdAt: iso(row.createdAt),
  };
}

export const listSuppliers = cache(async function listSuppliers(options?: { includeInactive?: boolean }): Promise<Supplier[]> {
  const rows = await db.supplier.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    contact: r.contact,
    phone: r.phone,
    inn: r.inn,
    isActive: r.isActive,
    createdAt: iso(r.createdAt),
  }));
});

/**
 * Сводка по поставщику: сколько накладных, на какую сумму и чем платили.
 * Это и есть содержание «акта сверки» — сколько всего получено от контрагента.
 */
export interface SupplierSummary {
  supplierId: string;
  receiptCount: number;
  materialCount: number;
  amount: number;
  cashAmount: number;
  transferAmount: number;
  lastReceiptAt: string | null;
}

export const getSupplierSummaries = cache(async function getSupplierSummaries(): Promise<Map<string, SupplierSummary>> {
  const rows = await db.$queryRaw<
    (Omit<SupplierSummary, "lastReceiptAt"> & { lastReceiptAt: Date | null })[]
  >`
    SELECT s.id AS "supplierId",
           (SELECT COUNT(*)::int FROM stock_movements WHERE supplier_id = s.id) AS "receiptCount",
           (SELECT COUNT(DISTINCT material_id)::int FROM stock_movements WHERE supplier_id = s.id) AS "materialCount",
           COALESCE((SELECT SUM(amount) FROM stock_movements WHERE supplier_id = s.id), 0) AS amount,
           COALESCE((SELECT SUM(amount) FROM stock_movements WHERE supplier_id = s.id AND payment_method = 'CASH'), 0) AS "cashAmount",
           COALESCE((SELECT SUM(amount) FROM stock_movements WHERE supplier_id = s.id AND payment_method = 'TRANSFER'), 0) AS "transferAmount",
           (SELECT MAX(occurred_at) FROM stock_movements WHERE supplier_id = s.id) AS "lastReceiptAt"
      FROM suppliers s
  `;
  return new Map(
    rows.map((r) => [
      r.supplierId,
      { ...r, lastReceiptAt: r.lastReceiptAt ? iso(r.lastReceiptAt) : null },
    ])
  );
});

export const listUsers = cache(async function listUsers(options?: { includeInactive?: boolean }): Promise<User[]> {
  const rows = await db.user.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: { fullName: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    fullName: r.fullName,
    position: r.position,
    phone: r.phone,
    role: r.role,
    isActive: r.isActive,
    createdAt: iso(r.createdAt),
  }));
});

/** Сколько операций провёл каждый сотрудник — для таблицы сотрудников. */
export const getUserOperationCounts = cache(async function getUserOperationCounts(): Promise<Map<string, number>> {
  const rows = await db.stockMovement.groupBy({ by: ["userId"], _count: { _all: true } });
  return new Map(rows.map((r) => [r.userId, r._count._all]));
});

/* ------------------------------------------------------------------ */
/* Дашборд                                                             */
/* ------------------------------------------------------------------ */

export interface PeriodTotals {
  receiptCount: number;
  issueCount: number;
  returnCount: number;
  receiptQty: number;
  issueQty: number;
  returnQty: number;
  /** Приход и расход в деньгах — количества разных материалов не складываются. */
  receiptAmount: number;
  issueAmount: number;
  returnAmount: number;
}

const EMPTY_TOTALS: PeriodTotals = {
  receiptCount: 0,
  issueCount: 0,
  returnCount: 0,
  receiptQty: 0,
  issueQty: 0,
  returnQty: 0,
  receiptAmount: 0,
  issueAmount: 0,
  returnAmount: 0,
};

export async function getPeriodTotals(fromIso: string): Promise<PeriodTotals> {
  const rows = await db.$queryRaw<PeriodTotals[]>`
    SELECT COUNT(*) FILTER (WHERE type = 'RECEIPT')::int AS "receiptCount",
           COUNT(*) FILTER (WHERE type = 'ISSUE')::int   AS "issueCount",
           COUNT(*) FILTER (WHERE type = 'RETURN')::int  AS "returnCount",
           COALESCE(SUM(quantity) FILTER (WHERE type = 'RECEIPT'), 0) AS "receiptQty",
           COALESCE(SUM(quantity) FILTER (WHERE type = 'ISSUE'), 0)   AS "issueQty",
           COALESCE(SUM(quantity) FILTER (WHERE type = 'RETURN'), 0)  AS "returnQty",
           COALESCE(SUM(amount) FILTER (WHERE type = 'RECEIPT'), 0)   AS "receiptAmount",
           COALESCE(SUM(amount) FILTER (WHERE type = 'ISSUE'), 0)     AS "issueAmount",
           COALESCE(SUM(amount) FILTER (WHERE type = 'RETURN'), 0)    AS "returnAmount"
      FROM stock_movements
     WHERE occurred_at >= ${new Date(fromIso)}
  `;
  return rows[0] ?? EMPTY_TOTALS;
}

export interface DailyActivity {
  day: string;
  receipts: number;
  issues: number;
  returns: number;
}

/** Активность по дням за последние N дней — для графика на дашборде. */
export async function getDailyActivity(days: number): Promise<DailyActivity[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const rows = await db.$queryRaw<DailyActivity[]>`
    SELECT to_char(occurred_at, 'YYYY-MM-DD') AS day,
           COUNT(*) FILTER (WHERE type = 'RECEIPT')::int AS receipts,
           COUNT(*) FILTER (WHERE type = 'ISSUE')::int   AS issues,
           COUNT(*) FILTER (WHERE type = 'RETURN')::int  AS returns
      FROM stock_movements
     WHERE occurred_at >= ${start}
     GROUP BY day
  `;

  const byDay = new Map(rows.map((r) => [r.day, r]));

  // Дни без операций тоже должны быть на графике, иначе ось времени «сжимается».
  const result: DailyActivity[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    result.push(byDay.get(key) ?? { day: key, receipts: 0, issues: 0, returns: 0 });
  }
  return result;
}

export interface DashboardData {
  materialsCount: number;
  /** Стоимость всего, что лежит на складе, по текущим ценам. */
  warehouseValue: number;
  blockPositions: number;
  blocksWithStock: number;
  lowStockMaterials: Material[];
  blocksCount: number;
  organizationsCount: number;
  suppliersCount: number;
  today: PeriodTotals;
  week: PeriodTotals;
  recentMovements: StockMovement[];
  activity: DailyActivity[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [materials, counts, today, week, recentMovements, activity] = await Promise.all([
    listMaterials(),
    db.$queryRaw<
      {
        blocksCount: number;
        organizationsCount: number;
        suppliersCount: number;
        blockPositions: number;
        blocksWithStock: number;
      }[]
    >`
      SELECT (SELECT COUNT(*)::int FROM blocks WHERE is_active)        AS "blocksCount",
             (SELECT COUNT(*)::int FROM organizations WHERE is_active) AS "organizationsCount",
             (SELECT COUNT(*)::int FROM suppliers WHERE is_active)     AS "suppliersCount",
             (SELECT COUNT(*)::int FROM block_stock WHERE quantity > 0) AS "blockPositions",
             (SELECT COUNT(DISTINCT block_id)::int FROM block_stock WHERE quantity > 0) AS "blocksWithStock"
    `,
    getPeriodTotals(startOfToday.toISOString()),
    getPeriodTotals(weekAgo.toISOString()),
    listMovements({ limit: 8 }),
    getDailyActivity(14),
  ]);

  const lowStockMaterials = materials
    .filter((m) => getStockStatus(m.quantity, m.minStock) !== "good")
    .sort((a, b) => {
      const ra = a.minStock > 0 ? a.quantity / a.minStock : 0;
      const rb = b.minStock > 0 ? b.quantity / b.minStock : 0;
      return ra - rb;
    });

  const c = counts[0] ?? {
    blocksCount: 0,
    organizationsCount: 0,
    suppliersCount: 0,
    blockPositions: 0,
    blocksWithStock: 0,
  };

  return {
    materialsCount: materials.length,
    warehouseValue: materials.reduce((sum, m) => sum + m.quantity * m.price, 0),
    blockPositions: c.blockPositions,
    blocksWithStock: c.blocksWithStock,
    lowStockMaterials,
    blocksCount: c.blocksCount,
    organizationsCount: c.organizationsCount,
    suppliersCount: c.suppliersCount,
    today,
    week,
    recentMovements,
    activity,
  };
}

/* ------------------------------------------------------------------ */
/* Детализация по материалу                                            */
/* ------------------------------------------------------------------ */

export interface BalancePoint {
  day: string;
  balance: number;
}

/**
 * История остатка материала по дням.
 * Берётся `warehouse_after` последней операции каждого дня — это точное
 * значение, записанное в момент операции, а не восстановленное задним числом.
 */
export async function getMaterialBalanceHistory(
  materialId: string,
  days: number
): Promise<BalancePoint[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const rows = await db.$queryRaw<BalancePoint[]>`
    SELECT to_char(sm.occurred_at, 'YYYY-MM-DD') AS day, sm.warehouse_after AS balance
      FROM stock_movements sm
     WHERE sm.material_id = ${materialId}
       AND sm.seq = (
         SELECT sm2.seq FROM stock_movements sm2
          WHERE sm2.material_id = sm.material_id
            AND to_char(sm2.occurred_at, 'YYYY-MM-DD') = to_char(sm.occurred_at, 'YYYY-MM-DD')
          ORDER BY sm2.occurred_at DESC, sm2.seq DESC
          LIMIT 1
       )
     ORDER BY day
  `;

  // Остаток на начало периода — последнее значение до его начала.
  const before = await db.stockMovement.findFirst({
    where: { materialId, occurredAt: { lt: start } },
    orderBy: [{ occurredAt: "desc" }, { seq: "desc" }],
    select: { warehouseAfter: true },
  });

  const byDay = new Map(rows.map((r) => [r.day, r.balance]));
  const result: BalancePoint[] = [];
  let running = before?.warehouseAfter ?? 0;

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    // В день без операций остаток не меняется — переносим предыдущее значение.
    if (byDay.has(key)) running = byDay.get(key)!;
    result.push({ day: key, balance: running });
  }
  return result;
}

/** За какими блоками сейчас числится этот материал. */
export async function getMaterialHolders(
  materialId: string
): Promise<{ blockId: string; blockName: string; description: string; quantity: number }[]> {
  const rows = await db.blockStock.findMany({
    where: { materialId, quantity: { gt: 0 } },
    include: { block: { select: { name: true, description: true } } },
    orderBy: { quantity: "desc" },
  });
  return rows.map((r) => ({
    blockId: r.blockId,
    blockName: r.block.name,
    description: r.block.description,
    quantity: r.quantity,
  }));
}

/** Итоги по материалу за всё время — в количестве и в деньгах. */
export async function getMaterialTotals(materialId: string): Promise<{
  received: number;
  issued: number;
  returned: number;
  receivedAmount: number;
  issuedAmount: number;
}> {
  const rows = await db.$queryRaw<
    { received: number; issued: number; returned: number; receivedAmount: number; issuedAmount: number }[]
  >`
    SELECT COALESCE(SUM(quantity) FILTER (WHERE type = 'RECEIPT'), 0) AS received,
           COALESCE(SUM(quantity) FILTER (WHERE type = 'ISSUE'), 0)   AS issued,
           COALESCE(SUM(quantity) FILTER (WHERE type = 'RETURN'), 0)  AS returned,
           COALESCE(SUM(amount) FILTER (WHERE type = 'RECEIPT'), 0)   AS "receivedAmount",
           COALESCE(SUM(amount) FILTER (WHERE type = 'ISSUE'), 0)     AS "issuedAmount"
      FROM stock_movements WHERE material_id = ${materialId}
  `;
  return rows[0] ?? { received: 0, issued: 0, returned: 0, receivedAmount: 0, issuedAmount: 0 };
}

/** Как менялась цена материала — каждая закупка со своей ценой. */
export async function getMaterialPriceHistory(
  materialId: string,
  limit = 12
): Promise<{ id: string; occurredAt: string; unitPrice: number; supplierName: string | null }[]> {
  const rows = await db.stockMovement.findMany({
    where: { materialId, type: "RECEIPT", unitPrice: { gt: 0 } },
    include: { supplier: { select: { name: true } } },
    orderBy: [{ occurredAt: "desc" }, { seq: "desc" }],
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    occurredAt: iso(r.occurredAt),
    unitPrice: r.unitPrice,
    supplierName: r.supplier?.name ?? null,
  }));
}

/* ------------------------------------------------------------------ */
/* Организации                                                         */
/* ------------------------------------------------------------------ */

export interface OrganizationSummary {
  organizationId: string;
  blocksCount: number;
  materialCount: number;
  movementCount: number;
  receiptAmount: number;
  issueAmount: number;
  lastOperationAt: string | null;
}

export const getOrganizationSummaries = cache(async function getOrganizationSummaries(): Promise<Map<string, OrganizationSummary>> {
  const rows = await db.$queryRaw<
    (Omit<OrganizationSummary, "lastOperationAt"> & { lastOperationAt: Date | null })[]
  >`
    SELECT o.id AS "organizationId",
           (SELECT COUNT(*)::int FROM blocks b WHERE b.organization_id = o.id AND b.is_active) AS "blocksCount",
           (SELECT COUNT(DISTINCT material_id)::int FROM stock_movements WHERE organization_id = o.id) AS "materialCount",
           (SELECT COUNT(*)::int FROM stock_movements WHERE organization_id = o.id) AS "movementCount",
           COALESCE((SELECT SUM(amount) FROM stock_movements WHERE organization_id = o.id AND type = 'RECEIPT'), 0) AS "receiptAmount",
           COALESCE((SELECT SUM(amount) FROM stock_movements WHERE organization_id = o.id AND type = 'ISSUE'), 0) AS "issueAmount",
           (SELECT MAX(occurred_at) FROM stock_movements WHERE organization_id = o.id) AS "lastOperationAt"
      FROM organizations o
  `;
  return new Map(
    rows.map((r) => [
      r.organizationId,
      { ...r, lastOperationAt: r.lastOperationAt ? iso(r.lastOperationAt) : null },
    ])
  );
});

/* ------------------------------------------------------------------ */
/* Отчёты                                                              */
/* ------------------------------------------------------------------ */

/** Отбор по периоду для отчётов: пустой, если период не задан. */
function periodFilter(fromIso?: string, toIso?: string) {
  const clauses: Prisma.Sql[] = [];
  if (fromIso) clauses.push(Prisma.sql` AND sm.occurred_at >= ${new Date(fromIso)}`);
  if (toIso) clauses.push(Prisma.sql` AND sm.occurred_at <= ${new Date(toIso)}`);
  return clauses.length ? Prisma.join(clauses, "") : Prisma.empty;
}

export interface StockReportRow {
  materialId: string;
  materialName: string;
  category: string;
  unit: string;
  price: number;
  atWarehouse: number;
  atBlocks: number;
  total: number;
  value: number;
  minStock: number;
  received: number;
  issued: number;
  returned: number;
  receivedAmount: number;
  issuedAmount: number;
}

export function getStockReport(fromIso?: string, toIso?: string): Promise<StockReportRow[]> {
  const period = periodFilter(fromIso, toIso);
  return db.$queryRaw<StockReportRow[]>`
    SELECT m.id AS "materialId", m.name AS "materialName", m.category, m.unit, m.price,
           m.quantity AS "atWarehouse",
           COALESCE((SELECT SUM(quantity) FROM block_stock WHERE material_id = m.id), 0) AS "atBlocks",
           m.quantity + COALESCE((SELECT SUM(quantity) FROM block_stock WHERE material_id = m.id), 0) AS total,
           m.quantity * m.price AS value,
           m.min_stock AS "minStock",
           COALESCE((SELECT SUM(sm.quantity) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'RECEIPT'${period}), 0) AS received,
           COALESCE((SELECT SUM(sm.quantity) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'ISSUE'${period}), 0)   AS issued,
           COALESCE((SELECT SUM(sm.quantity) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'RETURN'${period}), 0)  AS returned,
           COALESCE((SELECT SUM(sm.amount) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'RECEIPT'${period}), 0)   AS "receivedAmount",
           COALESCE((SELECT SUM(sm.amount) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'ISSUE'${period}), 0)     AS "issuedAmount"
      FROM materials m
     WHERE m.is_active
     ORDER BY lower(m.name)
  `;
}

export interface BlockReportRow {
  rowId: string;
  blockName: string;
  description: string;
  organizationName: string | null;
  materialName: string;
  unit: string;
  issued: number;
  returned: number;
  onHand: number;
  amount: number;
}

/**
 * Отчёт «расход материалов по блокам»: одна строка — блок и материал.
 * Разбивка по материалам обязательна, потому что у каждого своя единица
 * измерения и суммировать их в одно число нельзя.
 */
export function getBlockReport(fromIso?: string, toIso?: string): Promise<BlockReportRow[]> {
  const period = periodFilter(fromIso, toIso);
  return db.$queryRaw<BlockReportRow[]>`
    SELECT sm.block_id || ':' || sm.material_id AS "rowId",
           b.name AS "blockName", b.description, o.name AS "organizationName",
           m.name AS "materialName", m.unit,
           COALESCE(SUM(CASE WHEN sm.type = 'ISSUE'  THEN sm.quantity END), 0) AS issued,
           COALESCE(SUM(CASE WHEN sm.type = 'RETURN' THEN sm.quantity END), 0) AS returned,
           COALESCE((SELECT bs.quantity FROM block_stock bs
                      WHERE bs.block_id = sm.block_id AND bs.material_id = sm.material_id), 0) AS "onHand",
           COALESCE(SUM(CASE WHEN sm.type = 'ISSUE'  THEN sm.amount END), 0)
             - COALESCE(SUM(CASE WHEN sm.type = 'RETURN' THEN sm.amount END), 0) AS amount
      FROM stock_movements sm
      JOIN blocks b    ON b.id = sm.block_id
      JOIN materials m ON m.id = sm.material_id
      LEFT JOIN organizations o ON o.id = b.organization_id
     WHERE sm.block_id IS NOT NULL${period}
     GROUP BY sm.block_id, sm.material_id, b.name, b.description, b.sort_order, o.name, m.name, m.unit
     ORDER BY b.sort_order, lower(b.name), lower(m.name)
  `;
}

export interface SupplierReportRow {
  rowId: string;
  supplierName: string;
  contact: string;
  materialName: string;
  unit: string;
  received: number;
  amount: number;
  cashAmount: number;
  transferAmount: number;
  lastPrice: number;
}

/**
 * Отчёт по поставщикам: что и почём получено от каждого контрагента.
 * Разбивка по способу оплаты нужна для сверки наличных и перечислений.
 */
export function getSupplierReport(fromIso?: string, toIso?: string): Promise<SupplierReportRow[]> {
  const period = periodFilter(fromIso, toIso);
  return db.$queryRaw<SupplierReportRow[]>`
    SELECT sm.supplier_id || ':' || sm.material_id AS "rowId",
           s.name AS "supplierName", s.contact, m.name AS "materialName", m.unit,
           COALESCE(SUM(sm.quantity), 0) AS received,
           COALESCE(SUM(sm.amount), 0) AS amount,
           COALESCE(SUM(sm.amount) FILTER (WHERE sm.payment_method = 'CASH'), 0) AS "cashAmount",
           COALESCE(SUM(sm.amount) FILTER (WHERE sm.payment_method = 'TRANSFER'), 0) AS "transferAmount",
           COALESCE((SELECT sm2.unit_price FROM stock_movements sm2
                      WHERE sm2.supplier_id = sm.supplier_id AND sm2.material_id = sm.material_id
                      ORDER BY sm2.occurred_at DESC, sm2.seq DESC LIMIT 1), 0) AS "lastPrice"
      FROM stock_movements sm
      JOIN suppliers s ON s.id = sm.supplier_id
      JOIN materials m ON m.id = sm.material_id
     WHERE sm.supplier_id IS NOT NULL${period}
     GROUP BY sm.supplier_id, sm.material_id, s.name, s.contact, m.name, m.unit
     ORDER BY lower(s.name), lower(m.name)
  `;
}

import "@/lib/server-only";

import { cache } from "react";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { getStockStatus } from "@/constants/colors";
import type {
  Foreman,
  ForemanStockRow,
  Material,
  MovementType,
  Project,
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
  min_stock: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_receipt: Date | null;
  at_foremen: number;
}

function mapMaterial(row: MaterialAggregateRow): Material {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantity: row.quantity,
    minStock: row.min_stock,
    isActive: row.is_active,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    lastReceiptDate: row.last_receipt ? iso(row.last_receipt) : null,
    atForemen: row.at_foremen,
  };
}

export const listMaterials = cache(async function listMaterials(options?: { includeArchived?: boolean }): Promise<Material[]> {
  const rows = await db.$queryRaw<MaterialAggregateRow[]>`
    SELECT m.*,
           (SELECT MAX(occurred_at) FROM stock_movements
             WHERE material_id = m.id AND type = 'RECEIPT') AS last_receipt,
           COALESCE((SELECT SUM(quantity) FROM foreman_stock WHERE material_id = m.id), 0) AS at_foremen
      FROM materials m
     WHERE ${options?.includeArchived ? Prisma.sql`TRUE` : Prisma.sql`m.is_active = TRUE`}
     ORDER BY lower(m.name)
  `;
  return rows.map(mapMaterial);
});

export async function getMaterial(id: string): Promise<Material | null> {
  const rows = await db.$queryRaw<MaterialAggregateRow[]>`
    SELECT m.*,
           (SELECT MAX(occurred_at) FROM stock_movements
             WHERE material_id = m.id AND type = 'RECEIPT') AS last_receipt,
           COALESCE((SELECT SUM(quantity) FROM foreman_stock WHERE material_id = m.id), 0) AS at_foremen
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
  foreman: { select: { name: true } },
  supplier: { select: { name: true } },
  project: { select: { name: true } },
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
    userId: row.userId,
    userName: row.user.fullName,
    foremanId: row.foremanId,
    foremanName: row.foreman?.name ?? null,
    supplierId: row.supplierId,
    supplierName: row.supplier?.name ?? null,
    projectId: row.projectId,
    projectName: row.project?.name ?? null,
    vehicleNumber: row.vehicleNumber,
    reason: row.reason,
    comment: row.comment,
    warehouseDelta: row.warehouseDelta,
    foremanDelta: row.foremanDelta,
    warehouseAfter: row.warehouseAfter,
    foremanAfter: row.foremanAfter,
  };
}

export interface MovementFilters {
  type?: MovementType | "all";
  materialId?: string;
  foremanId?: string;
  userId?: string;
  projectId?: string;
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
    foremanId: pick(filters.foremanId),
    userId: pick(filters.userId),
    projectId: pick(filters.projectId),
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
      { foreman: { name: { contains: term, mode: "insensitive" } } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
      { project: { name: { contains: term, mode: "insensitive" } } },
      { comment: { contains: term, mode: "insensitive" } },
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
/* Бригадиры                                                           */
/* ------------------------------------------------------------------ */

type ForemanWithProject = Prisma.ForemanGetPayload<{ include: { project: { select: { name: true } } } }>;

function mapForeman(row: ForemanWithProject): Foreman {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    brigade: row.brigade,
    projectId: row.projectId,
    projectName: row.project?.name ?? null,
    isActive: row.isActive,
    createdAt: iso(row.createdAt),
  };
}

export const listForemen = cache(async function listForemen(options?: { includeInactive?: boolean }): Promise<Foreman[]> {
  const rows = await db.foreman.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    include: { project: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return rows.map(mapForeman);
});

export async function getForeman(id: string): Promise<Foreman | null> {
  const row = await db.foreman.findUnique({
    where: { id },
    include: { project: { select: { name: true } } },
  });
  return row ? mapForeman(row) : null;
}

/** Что прямо сейчас находится на руках у бригадира (только ненулевые позиции). */
export async function getForemanStock(foremanId: string): Promise<ForemanStockRow[]> {
  const rows = await db.foremanStock.findMany({
    where: { foremanId, quantity: { gt: 0 } },
    include: { material: { select: { name: true, unit: true } } },
    orderBy: { material: { name: "asc" } },
  });
  return rows.map((row) => ({
    foremanId: row.foremanId,
    materialId: row.materialId,
    materialName: row.material.name,
    unit: row.material.unit,
    quantity: row.quantity,
    updatedAt: iso(row.updatedAt),
  }));
}

export interface ForemanMaterialTotal {
  materialId: string;
  materialName: string;
  unit: string;
  received: number;
  used: number;
  returned: number;
  onHand: number;
}

/**
 * По каждому материалу: сколько бригадир получил, израсходовал, вернул
 * и сколько осталось на руках. Каждая строка — один материал со своей
 * единицей измерения, поэтому числа сопоставимы и осмысленны.
 */
export function getForemanMaterialTotals(foremanId: string): Promise<ForemanMaterialTotal[]> {
  return db.$queryRaw<ForemanMaterialTotal[]>`
    SELECT sm.material_id AS "materialId", m.name AS "materialName", m.unit,
           COALESCE(SUM(CASE WHEN sm.type = 'ISSUE'  THEN sm.quantity END), 0) AS received,
           COALESCE(SUM(CASE WHEN sm.type = 'USAGE'  THEN sm.quantity END), 0) AS used,
           COALESCE(SUM(CASE WHEN sm.type = 'RETURN' THEN sm.quantity END), 0) AS returned,
           COALESCE((SELECT fs.quantity FROM foreman_stock fs
                      WHERE fs.foreman_id = sm.foreman_id AND fs.material_id = sm.material_id), 0) AS "onHand"
      FROM stock_movements sm
      JOIN materials m ON m.id = sm.material_id
     WHERE sm.foreman_id = ${foremanId}
     GROUP BY sm.material_id, sm.foreman_id, m.name, m.unit
     ORDER BY "onHand" DESC, lower(m.name)
  `;
}

/**
 * Сводка по бригадиру считается в количестве операций, а не в сумме количеств:
 * складывать тонны арматуры со штуками кирпича бессмысленно.
 */
export interface ForemanSummary {
  foremanId: string;
  positions: number;
  issueCount: number;
  usageCount: number;
  returnCount: number;
  lastOperationAt: string | null;
}

export const getForemenSummaries = cache(async function getForemenSummaries(): Promise<Map<string, ForemanSummary>> {
  const rows = await db.$queryRaw<
    (Omit<ForemanSummary, "lastOperationAt"> & { lastOperationAt: Date | null })[]
  >`
    SELECT f.id AS "foremanId",
           (SELECT COUNT(*)::int FROM foreman_stock fs WHERE fs.foreman_id = f.id AND fs.quantity > 0) AS positions,
           (SELECT COUNT(*)::int FROM stock_movements WHERE foreman_id = f.id AND type = 'ISSUE')  AS "issueCount",
           (SELECT COUNT(*)::int FROM stock_movements WHERE foreman_id = f.id AND type = 'USAGE')  AS "usageCount",
           (SELECT COUNT(*)::int FROM stock_movements WHERE foreman_id = f.id AND type = 'RETURN') AS "returnCount",
           (SELECT MAX(occurred_at) FROM stock_movements WHERE foreman_id = f.id) AS "lastOperationAt"
      FROM foremen f
  `;
  return new Map(
    rows.map((r) => [
      r.foremanId,
      { ...r, lastOperationAt: r.lastOperationAt ? iso(r.lastOperationAt) : null },
    ])
  );
});

/* ------------------------------------------------------------------ */
/* Справочники                                                         */
/* ------------------------------------------------------------------ */

export const listProjects = cache(async function listProjects(options?: { includeInactive?: boolean }): Promise<Project[]> {
  const rows = await db.project.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    isActive: r.isActive,
    createdAt: iso(r.createdAt),
  }));
});

export const listSuppliers = cache(async function listSuppliers(options?: { includeInactive?: boolean }): Promise<Supplier[]> {
  const rows = await db.supplier.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    contact: r.contact,
    isActive: r.isActive,
    createdAt: iso(r.createdAt),
  }));
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
  usageCount: number;
  returnCount: number;
  receiptQty: number;
  issueQty: number;
  usageQty: number;
  returnQty: number;
}

export async function getPeriodTotals(fromIso: string): Promise<PeriodTotals> {
  const rows = await db.$queryRaw<PeriodTotals[]>`
    SELECT COUNT(*) FILTER (WHERE type = 'RECEIPT')::int AS "receiptCount",
           COUNT(*) FILTER (WHERE type = 'ISSUE')::int   AS "issueCount",
           COUNT(*) FILTER (WHERE type = 'USAGE')::int   AS "usageCount",
           COUNT(*) FILTER (WHERE type = 'RETURN')::int  AS "returnCount",
           COALESCE(SUM(quantity) FILTER (WHERE type = 'RECEIPT'), 0) AS "receiptQty",
           COALESCE(SUM(quantity) FILTER (WHERE type = 'ISSUE'), 0)   AS "issueQty",
           COALESCE(SUM(quantity) FILTER (WHERE type = 'USAGE'), 0)   AS "usageQty",
           COALESCE(SUM(quantity) FILTER (WHERE type = 'RETURN'), 0)  AS "returnQty"
      FROM stock_movements
     WHERE occurred_at >= ${new Date(fromIso)}
  `;
  return (
    rows[0] ?? {
      receiptCount: 0, issueCount: 0, usageCount: 0, returnCount: 0,
      receiptQty: 0, issueQty: 0, usageQty: 0, returnQty: 0,
    }
  );
}

export interface DailyActivity {
  day: string;
  receipts: number;
  issues: number;
  usages: number;
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
           COUNT(*) FILTER (WHERE type = 'USAGE')::int   AS usages,
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
    result.push(byDay.get(key) ?? { day: key, receipts: 0, issues: 0, usages: 0, returns: 0 });
  }
  return result;
}

export interface DashboardData {
  materialsCount: number;
  foremanPositions: number;
  foremenWithStock: number;
  lowStockMaterials: Material[];
  foremenCount: number;
  projectsCount: number;
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
      { foremenCount: number; projectsCount: number; foremanPositions: number; foremenWithStock: number }[]
    >`
      SELECT (SELECT COUNT(*)::int FROM foremen WHERE is_active)  AS "foremenCount",
             (SELECT COUNT(*)::int FROM projects WHERE is_active) AS "projectsCount",
             (SELECT COUNT(*)::int FROM foreman_stock WHERE quantity > 0) AS "foremanPositions",
             (SELECT COUNT(DISTINCT foreman_id)::int FROM foreman_stock WHERE quantity > 0) AS "foremenWithStock"
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
    foremenCount: 0, projectsCount: 0, foremanPositions: 0, foremenWithStock: 0,
  };

  return {
    materialsCount: materials.length,
    foremanPositions: c.foremanPositions,
    foremenWithStock: c.foremenWithStock,
    lowStockMaterials,
    foremenCount: c.foremenCount,
    projectsCount: c.projectsCount,
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

/** У кого из бригадиров сейчас находится этот материал. */
export async function getMaterialHolders(
  materialId: string
): Promise<{ foremanId: string; foremanName: string; brigade: string; quantity: number }[]> {
  const rows = await db.foremanStock.findMany({
    where: { materialId, quantity: { gt: 0 } },
    include: { foreman: { select: { name: true, brigade: true } } },
    orderBy: { quantity: "desc" },
  });
  return rows.map((r) => ({
    foremanId: r.foremanId,
    foremanName: r.foreman.name,
    brigade: r.foreman.brigade,
    quantity: r.quantity,
  }));
}

/** Итоги по материалу за всё время. */
export async function getMaterialTotals(
  materialId: string
): Promise<{ received: number; issued: number; used: number; returned: number }> {
  const rows = await db.$queryRaw<{ received: number; issued: number; used: number; returned: number }[]>`
    SELECT COALESCE(SUM(quantity) FILTER (WHERE type = 'RECEIPT'), 0) AS received,
           COALESCE(SUM(quantity) FILTER (WHERE type = 'ISSUE'), 0)   AS issued,
           COALESCE(SUM(quantity) FILTER (WHERE type = 'USAGE'), 0)   AS used,
           COALESCE(SUM(quantity) FILTER (WHERE type = 'RETURN'), 0)  AS returned
      FROM stock_movements WHERE material_id = ${materialId}
  `;
  return rows[0] ?? { received: 0, issued: 0, used: 0, returned: 0 };
}

/* ------------------------------------------------------------------ */
/* Объекты                                                             */
/* ------------------------------------------------------------------ */

export interface ProjectSummary {
  projectId: string;
  foremenCount: number;
  materialCount: number;
  issueCount: number;
  usageCount: number;
  movementCount: number;
  lastOperationAt: string | null;
}

export const getProjectSummaries = cache(async function getProjectSummaries(): Promise<Map<string, ProjectSummary>> {
  const rows = await db.$queryRaw<
    (Omit<ProjectSummary, "lastOperationAt"> & { lastOperationAt: Date | null })[]
  >`
    SELECT p.id AS "projectId",
           (SELECT COUNT(*)::int FROM foremen f WHERE f.project_id = p.id AND f.is_active) AS "foremenCount",
           (SELECT COUNT(DISTINCT material_id)::int FROM stock_movements WHERE project_id = p.id) AS "materialCount",
           (SELECT COUNT(*)::int FROM stock_movements WHERE project_id = p.id AND type = 'ISSUE') AS "issueCount",
           (SELECT COUNT(*)::int FROM stock_movements WHERE project_id = p.id AND type = 'USAGE') AS "usageCount",
           (SELECT COUNT(*)::int FROM stock_movements WHERE project_id = p.id) AS "movementCount",
           (SELECT MAX(occurred_at) FROM stock_movements WHERE project_id = p.id) AS "lastOperationAt"
      FROM projects p
  `;
  return new Map(
    rows.map((r) => [
      r.projectId,
      { ...r, lastOperationAt: r.lastOperationAt ? iso(r.lastOperationAt) : null },
    ])
  );
});

export async function getProject(id: string): Promise<Project | null> {
  const row = await db.project.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    isActive: row.isActive,
    createdAt: iso(row.createdAt),
  };
}

/** Сколько какого материала ушло на объект — основа отчёта по объекту. */
export function getProjectMaterialTotals(
  projectId: string
): Promise<{ materialId: string; materialName: string; unit: string; issued: number; used: number }[]> {
  return db.$queryRaw`
    SELECT sm.material_id AS "materialId", m.name AS "materialName", m.unit,
           COALESCE(SUM(CASE WHEN sm.type = 'ISSUE' THEN sm.quantity END), 0) AS issued,
           COALESCE(SUM(CASE WHEN sm.type = 'USAGE' THEN sm.quantity END), 0) AS used
      FROM stock_movements sm
      JOIN materials m ON m.id = sm.material_id
     WHERE sm.project_id = ${projectId}
     GROUP BY sm.material_id, m.name, m.unit
    HAVING COALESCE(SUM(CASE WHEN sm.type = 'ISSUE' THEN sm.quantity END), 0) > 0
        OR COALESCE(SUM(CASE WHEN sm.type = 'USAGE' THEN sm.quantity END), 0) > 0
     ORDER BY lower(m.name)
  `;
}

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
  atWarehouse: number;
  atForemen: number;
  total: number;
  minStock: number;
  received: number;
  issued: number;
  used: number;
  returned: number;
}

export function getStockReport(fromIso?: string, toIso?: string): Promise<StockReportRow[]> {
  const period = periodFilter(fromIso, toIso);
  return db.$queryRaw<StockReportRow[]>`
    SELECT m.id AS "materialId", m.name AS "materialName", m.category, m.unit,
           m.quantity AS "atWarehouse",
           COALESCE((SELECT SUM(quantity) FROM foreman_stock WHERE material_id = m.id), 0) AS "atForemen",
           m.quantity + COALESCE((SELECT SUM(quantity) FROM foreman_stock WHERE material_id = m.id), 0) AS total,
           m.min_stock AS "minStock",
           COALESCE((SELECT SUM(sm.quantity) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'RECEIPT'${period}), 0) AS received,
           COALESCE((SELECT SUM(sm.quantity) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'ISSUE'${period}), 0)   AS issued,
           COALESCE((SELECT SUM(sm.quantity) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'USAGE'${period}), 0)   AS used,
           COALESCE((SELECT SUM(sm.quantity) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'RETURN'${period}), 0)  AS returned
      FROM materials m
     WHERE m.is_active
     ORDER BY lower(m.name)
  `;
}

export interface ForemanReportRow {
  rowId: string;
  foremanName: string;
  brigade: string;
  projectName: string | null;
  materialName: string;
  unit: string;
  issued: number;
  used: number;
  returned: number;
  onHand: number;
}

/**
 * Отчёт «движение материалов по бригадирам»: одна строка — бригадир и материал.
 * Разбивка по материалам обязательна, потому что у каждого своя единица
 * измерения и суммировать их в одно число нельзя.
 */
export function getForemanReport(fromIso?: string, toIso?: string): Promise<ForemanReportRow[]> {
  const period = periodFilter(fromIso, toIso);
  return db.$queryRaw<ForemanReportRow[]>`
    SELECT sm.foreman_id || ':' || sm.material_id AS "rowId",
           f.name AS "foremanName", f.brigade, p.name AS "projectName",
           m.name AS "materialName", m.unit,
           COALESCE(SUM(CASE WHEN sm.type = 'ISSUE'  THEN sm.quantity END), 0) AS issued,
           COALESCE(SUM(CASE WHEN sm.type = 'USAGE'  THEN sm.quantity END), 0) AS used,
           COALESCE(SUM(CASE WHEN sm.type = 'RETURN' THEN sm.quantity END), 0) AS returned,
           COALESCE((SELECT fs.quantity FROM foreman_stock fs
                      WHERE fs.foreman_id = sm.foreman_id AND fs.material_id = sm.material_id), 0) AS "onHand"
      FROM stock_movements sm
      JOIN foremen f   ON f.id = sm.foreman_id
      JOIN materials m ON m.id = sm.material_id
      LEFT JOIN projects p ON p.id = f.project_id
     WHERE sm.foreman_id IS NOT NULL${period}
     GROUP BY sm.foreman_id, sm.material_id, f.name, f.brigade, p.name, m.name, m.unit
     ORDER BY lower(f.name), lower(m.name)
  `;
}

export interface ProjectReportRow {
  rowId: string;
  projectName: string;
  address: string;
  materialName: string;
  unit: string;
  issued: number;
  used: number;
  remaining: number;
}

export function getProjectReport(fromIso?: string, toIso?: string): Promise<ProjectReportRow[]> {
  const period = periodFilter(fromIso, toIso);
  return db.$queryRaw<ProjectReportRow[]>`
    SELECT sm.project_id || ':' || sm.material_id AS "rowId",
           p.name AS "projectName", p.address, m.name AS "materialName", m.unit,
           COALESCE(SUM(CASE WHEN sm.type = 'ISSUE' THEN sm.quantity END), 0) AS issued,
           COALESCE(SUM(CASE WHEN sm.type = 'USAGE' THEN sm.quantity END), 0) AS used,
           COALESCE(SUM(CASE WHEN sm.type = 'ISSUE' THEN sm.quantity END), 0)
             - COALESCE(SUM(CASE WHEN sm.type = 'USAGE' THEN sm.quantity END), 0) AS remaining
      FROM stock_movements sm
      JOIN projects p  ON p.id = sm.project_id
      JOIN materials m ON m.id = sm.material_id
     WHERE sm.project_id IS NOT NULL${period}
     GROUP BY sm.project_id, sm.material_id, p.name, p.address, m.name, m.unit
     ORDER BY lower(p.name), lower(m.name)
  `;
}

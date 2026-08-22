import "@/lib/server-only";

import { queryAll, queryOne, type SqlParam } from "@/lib/db/client";
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

/* ------------------------------------------------------------------ */
/* Материалы                                                           */
/* ------------------------------------------------------------------ */

const MATERIAL_SELECT = `
  SELECT m.id, m.name, m.category, m.unit, m.quantity, m.min_stock, m.is_active,
         m.created_at, m.updated_at,
         (SELECT MAX(occurred_at) FROM stock_movements
           WHERE material_id = m.id AND type = 'RECEIPT') AS last_receipt,
         COALESCE((SELECT SUM(quantity) FROM foreman_stock WHERE material_id = m.id), 0) AS at_foremen
    FROM materials m
`;

interface MaterialRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  min_stock: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  last_receipt: string | null;
  at_foremen: number;
}

function mapMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantity: row.quantity,
    minStock: row.min_stock,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastReceiptDate: row.last_receipt,
    atForemen: row.at_foremen,
  };
}

export async function listMaterials(options?: { includeArchived?: boolean }): Promise<Material[]> {
  const where = options?.includeArchived ? "" : "WHERE m.is_active = 1";
  return (await queryAll<MaterialRow>(`${MATERIAL_SELECT} ${where} ORDER BY lower(m.name)`)).map(mapMaterial);
}

export async function getMaterial(id: string): Promise<Material | null> {
  const row = await queryOne<MaterialRow>(`${MATERIAL_SELECT} WHERE m.id = ?`, id);
  return row ? mapMaterial(row) : null;
}

/** Сколько раз материал встречается в журнале — материал с историей удалять нельзя. */
export async function countMaterialMovements(materialId: string): Promise<number> {
  const row = await queryOne<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM stock_movements WHERE material_id = ?",
    materialId
  );
  return row?.c ?? 0;
}

/* ------------------------------------------------------------------ */
/* Движения                                                            */
/* ------------------------------------------------------------------ */

/**
 * Журнал только пополняется, поэтому `seq` — это порядок записи операций.
 * Он используется вторым ключом сортировки: несколько операций одного дня
 * могут иметь одинаковое время, и без него история показывалась бы вразнобой.
 */
const MOVEMENT_SELECT = `
  SELECT sm.id, sm.type, sm.occurred_at, sm.created_at, sm.quantity,
         sm.material_id, m.name AS material_name, m.unit,
         sm.user_id, u.full_name AS user_name,
         sm.foreman_id, f.name AS foreman_name,
         sm.supplier_id, s.name AS supplier_name,
         sm.project_id, p.name AS project_name,
         sm.vehicle_number, sm.reason, sm.comment,
         sm.warehouse_delta, sm.foreman_delta, sm.warehouse_after, sm.foreman_after
    FROM stock_movements sm
    JOIN materials m  ON m.id = sm.material_id
    JOIN users     u  ON u.id = sm.user_id
    LEFT JOIN foremen   f ON f.id = sm.foreman_id
    LEFT JOIN suppliers s ON s.id = sm.supplier_id
    LEFT JOIN projects  p ON p.id = sm.project_id
`;

interface MovementRow {
  id: string;
  type: MovementType;
  occurred_at: string;
  created_at: string;
  quantity: number;
  material_id: string;
  material_name: string;
  unit: string;
  user_id: string;
  user_name: string;
  foreman_id: string | null;
  foreman_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  project_id: string | null;
  project_name: string | null;
  vehicle_number: string;
  reason: string;
  comment: string;
  warehouse_delta: number;
  foreman_delta: number;
  warehouse_after: number;
  foreman_after: number | null;
}

function mapMovement(row: MovementRow): StockMovement {
  return {
    id: row.id,
    type: row.type,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    materialId: row.material_id,
    materialName: row.material_name,
    unit: row.unit,
    quantity: row.quantity,
    userId: row.user_id,
    userName: row.user_name,
    foremanId: row.foreman_id,
    foremanName: row.foreman_name,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    projectId: row.project_id,
    projectName: row.project_name,
    vehicleNumber: row.vehicle_number,
    reason: row.reason,
    comment: row.comment,
    warehouseDelta: row.warehouse_delta,
    foremanDelta: row.foreman_delta,
    warehouseAfter: row.warehouse_after,
    foremanAfter: row.foreman_after,
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
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.type && filters.type !== "all") {
    clauses.push("sm.type = ?");
    params.push(filters.type);
  }
  if (filters.materialId && filters.materialId !== "all") {
    clauses.push("sm.material_id = ?");
    params.push(filters.materialId);
  }
  if (filters.foremanId && filters.foremanId !== "all") {
    clauses.push("sm.foreman_id = ?");
    params.push(filters.foremanId);
  }
  if (filters.userId && filters.userId !== "all") {
    clauses.push("sm.user_id = ?");
    params.push(filters.userId);
  }
  if (filters.projectId && filters.projectId !== "all") {
    clauses.push("sm.project_id = ?");
    params.push(filters.projectId);
  }
  if (filters.supplierId && filters.supplierId !== "all") {
    clauses.push("sm.supplier_id = ?");
    params.push(filters.supplierId);
  }
  if (filters.from) {
    clauses.push("sm.occurred_at >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push("sm.occurred_at <= ?");
    params.push(filters.to);
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim().toLowerCase()}%`;
    clauses.push(
      `(LOWER(m.name) LIKE ? OR LOWER(u.full_name) LIKE ? OR LOWER(COALESCE(f.name, '')) LIKE ?
        OR LOWER(COALESCE(s.name, '')) LIKE ? OR LOWER(COALESCE(p.name, '')) LIKE ?
        OR LOWER(sm.comment) LIKE ? OR LOWER(sm.vehicle_number) LIKE ?)`
    );
    params.push(term, term, term, term, term, term, term);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filters.limit ? `LIMIT ${Number(filters.limit)}` : "";

  return (await queryAll<MovementRow>(
    `${MOVEMENT_SELECT} ${where} ORDER BY sm.occurred_at DESC, sm.seq DESC ${limit}`,
    ...params
  )).map(mapMovement);
}

/* ------------------------------------------------------------------ */
/* Бригадиры                                                           */
/* ------------------------------------------------------------------ */

interface ForemanRow {
  id: string;
  name: string;
  phone: string;
  brigade: string;
  project_id: string | null;
  project_name: string | null;
  is_active: number;
  created_at: string;
}

function mapForeman(row: ForemanRow): Foreman {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    brigade: row.brigade,
    projectId: row.project_id,
    projectName: row.project_name,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

const FOREMAN_SELECT = `
  SELECT f.id, f.name, f.phone, f.brigade, f.project_id, p.name AS project_name,
         f.is_active, f.created_at
    FROM foremen f
    LEFT JOIN projects p ON p.id = f.project_id
`;

export async function listForemen(options?: { includeInactive?: boolean }): Promise<Foreman[]> {
  const where = options?.includeInactive ? "" : "WHERE f.is_active = 1";
  return (await queryAll<ForemanRow>(`${FOREMAN_SELECT} ${where} ORDER BY lower(f.name)`)).map(mapForeman);
}

export async function getForeman(id: string): Promise<Foreman | null> {
  const row = await queryOne<ForemanRow>(`${FOREMAN_SELECT} WHERE f.id = ?`, id);
  return row ? mapForeman(row) : null;
}

/** Что прямо сейчас находится на руках у бригадира (только ненулевые позиции). */
export async function getForemanStock(foremanId: string): Promise<ForemanStockRow[]> {
  return await queryAll<ForemanStockRow>(
    `SELECT fs.foreman_id AS "foremanId", fs.material_id AS "materialId",
            m.name AS "materialName", m.unit, fs.quantity, fs.updated_at AS "updatedAt"
       FROM foreman_stock fs
       JOIN materials m ON m.id = fs.material_id
      WHERE fs.foreman_id = ? AND fs.quantity > 0
      ORDER BY lower(m.name)`,
    foremanId
  );
}

/**
 * Сводка по бригадиру считается в количестве операций, а не в сумме количеств:
 * складывать тонны арматуры со штуками кирпича бессмысленно. Сами объёмы
 * показываются по каждому материалу отдельно — см. `getForemanMaterialTotals`.
 */
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
export async function getForemanMaterialTotals(foremanId: string): Promise<ForemanMaterialTotal[]> {
  return await queryAll<ForemanMaterialTotal>(
    `SELECT sm.material_id AS "materialId", m.name AS "materialName", m.unit,
            COALESCE(SUM(CASE WHEN sm.type = 'ISSUE'  THEN sm.quantity END), 0) AS received,
            COALESCE(SUM(CASE WHEN sm.type = 'USAGE'  THEN sm.quantity END), 0) AS used,
            COALESCE(SUM(CASE WHEN sm.type = 'RETURN' THEN sm.quantity END), 0) AS returned,
            COALESCE((SELECT fs.quantity FROM foreman_stock fs
                       WHERE fs.foreman_id = sm.foreman_id AND fs.material_id = sm.material_id), 0) AS "onHand"
       FROM stock_movements sm
       JOIN materials m ON m.id = sm.material_id
      WHERE sm.foreman_id = ?
      GROUP BY sm.material_id, sm.foreman_id, m.name, m.unit
      ORDER BY "onHand" DESC, lower(m.name)`,
    foremanId
  );
}

export interface ForemanSummary {
  foremanId: string;
  /** Позиций материалов на руках. */
  positions: number;
  issueCount: number;
  usageCount: number;
  returnCount: number;
  lastOperationAt: string | null;
}

/** Сводка по всем бригадирам одним запросом — чтобы не делать N+1 в таблице. */
export async function getForemenSummaries(): Promise<Map<string, ForemanSummary>> {
  const rows = await queryAll<ForemanSummary>(
    `SELECT f.id AS "foremanId",
              (SELECT COUNT(*)::int FROM foreman_stock fs WHERE fs.foreman_id = f.id AND fs.quantity > 0) AS "positions",
            (SELECT COUNT(*) FROM stock_movements WHERE foreman_id = f.id AND type = 'ISSUE')  AS "issueCount",
            (SELECT COUNT(*) FROM stock_movements WHERE foreman_id = f.id AND type = 'USAGE')  AS "usageCount",
            (SELECT COUNT(*)::int FROM stock_movements WHERE foreman_id = f.id AND type = 'RETURN') AS "returnCount",
            (SELECT MAX(occurred_at) FROM stock_movements WHERE foreman_id = f.id) AS "lastOperationAt"
       FROM foremen f`
  );

  return new Map(rows.map((r) => [r.foremanId, r]));
}

/* ------------------------------------------------------------------ */
/* Справочники                                                         */
/* ------------------------------------------------------------------ */

export async function listProjects(options?: { includeInactive?: boolean }): Promise<Project[]> {
  const where = options?.includeInactive ? "" : "WHERE is_active = 1";
  return (
    await queryAll<{ id: string; name: string; address: string; is_active: number; created_at: string }>(
      `SELECT id, name, address, is_active, created_at FROM projects ${where} ORDER BY lower(name)`
    )
  ).map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
  }));
}

export async function listSuppliers(options?: { includeInactive?: boolean }): Promise<Supplier[]> {
  const where = options?.includeInactive ? "" : "WHERE is_active = 1";
  return (await queryAll<{ id: string; name: string; contact: string; is_active: number; created_at: string }>(
    `SELECT id, name, contact, is_active, created_at FROM suppliers ${where} ORDER BY lower(name)`
  )).map((r) => ({
    id: r.id,
    name: r.name,
    contact: r.contact,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
  }));
}

export async function listUsers(options?: { includeInactive?: boolean }): Promise<User[]> {
  const where = options?.includeInactive ? "" : "WHERE is_active = 1";
  return (await queryAll<{
    id: string;
    username: string;
    full_name: string;
    position: string;
    phone: string;
    role: User["role"];
    is_active: number;
    created_at: string;
  }>(
    `SELECT id, username, full_name, position, phone, role, is_active, created_at
       FROM users ${where} ORDER BY lower(full_name)`
  )).map((r) => ({
    id: r.id,
    username: r.username,
    fullName: r.full_name,
    position: r.position,
    phone: r.phone,
    role: r.role,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
  }));
}

/** Сколько операций провёл каждый сотрудник — для таблицы сотрудников. */
export async function getUserOperationCounts(): Promise<Map<string, number>> {
  const rows = await queryAll<{ id: string; c: number }>(
    "SELECT user_id AS id, COUNT(*)::int AS c FROM stock_movements GROUP BY user_id"
  );
  return new Map(rows.map((r) => [r.id, r.c]));
}

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
  const row = await queryOne<PeriodTotals>(
    `SELECT
       COUNT(*) FILTER (WHERE type = 'RECEIPT')::int AS "receiptCount",
         COUNT(*) FILTER (WHERE type = 'ISSUE')::int AS "issueCount",
         COUNT(*) FILTER (WHERE type = 'USAGE')::int AS "usageCount",
         COUNT(*) FILTER (WHERE type = 'RETURN')::int AS "returnCount",
         COALESCE(SUM(CASE WHEN type = 'RECEIPT' THEN quantity END), 0) AS "receiptQty",
         COALESCE(SUM(CASE WHEN type = 'ISSUE'   THEN quantity END), 0) AS "issueQty",
         COALESCE(SUM(CASE WHEN type = 'USAGE'   THEN quantity END), 0) AS "usageQty",
         COALESCE(SUM(CASE WHEN type = 'RETURN'  THEN quantity END), 0) AS "returnQty"
     FROM stock_movements
    WHERE occurred_at >= ?`,
    fromIso
  );
  return (
    row ?? {
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

  const rows = await queryAll<DailyActivity>(
    `SELECT substr(occurred_at, 1, 10) AS day,
              COUNT(*) FILTER (WHERE type = 'RECEIPT')::int AS "receipts",
              COUNT(*) FILTER (WHERE type = 'ISSUE')::int AS "issues",
              COUNT(*) FILTER (WHERE type = 'USAGE')::int AS "usages",
              COUNT(*) FILTER (WHERE type = 'RETURN')::int AS "returns"
       FROM stock_movements
      WHERE occurred_at >= ?
      GROUP BY day`,
    start.toISOString()
  );

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
  /** Позиций материалов, числящихся за бригадирами (не сумма количеств). */
  foremanPositions: number;
  /** Бригадиров, за которыми что-то числится. */
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
  const materials = await listMaterials();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const lowStockMaterials = materials
    .filter((m) => getStockStatus(m.quantity, m.minStock) !== "good")
    .sort((a, b) => {
      const ra = a.minStock > 0 ? a.quantity / a.minStock : 0;
      const rb = b.minStock > 0 ? b.quantity / b.minStock : 0;
      return ra - rb;
    });

  const counts = await queryOne<{
    foremenCount: number;
    projectsCount: number;
    foremanPositions: number;
    foremenWithStock: number;
  }>(
    `SELECT (SELECT COUNT(*) FROM foremen WHERE is_active = 1)  AS "foremenCount",
            (SELECT COUNT(*)::int FROM projects WHERE is_active = 1) AS "projectsCount",
            (SELECT COUNT(*)::int FROM foreman_stock WHERE quantity > 0) AS "foremanPositions",
            (SELECT COUNT(DISTINCT foreman_id)::int FROM foreman_stock WHERE quantity > 0) AS "foremenWithStock"`
  ) ?? { foremenCount: 0, projectsCount: 0, foremanPositions: 0, foremenWithStock: 0 };

  return {
    materialsCount: materials.length,
    foremanPositions: counts.foremanPositions,
    foremenWithStock: counts.foremenWithStock,
    lowStockMaterials,
    foremenCount: counts.foremenCount,
    projectsCount: counts.projectsCount,
    today: await getPeriodTotals(startOfToday.toISOString()),
    week: await getPeriodTotals(weekAgo.toISOString()),
    recentMovements: await listMovements({ limit: 8 }),
    activity: await getDailyActivity(14),
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
export async function getMaterialBalanceHistory(materialId: string, days: number): Promise<BalancePoint[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const rows = await queryAll<{ day: string; balance: number }>(
    `SELECT substr(sm.occurred_at, 1, 10) AS day,
            sm.warehouse_after AS balance
       FROM stock_movements sm
      WHERE sm.material_id = ?
        AND sm.seq = (
          SELECT sm2.seq FROM stock_movements sm2
           WHERE sm2.material_id = sm.material_id
             AND substr(sm2.occurred_at, 1, 10) = substr(sm.occurred_at, 1, 10)
           ORDER BY sm2.occurred_at DESC, sm2.seq DESC
           LIMIT 1
        )
      ORDER BY day`,
    materialId
  );

  // Остаток на начало периода — последнее значение до его начала.
  const before = await queryOne<{ balance: number }>(
    `SELECT warehouse_after AS balance FROM stock_movements
      WHERE material_id = ? AND occurred_at < ?
      ORDER BY occurred_at DESC, seq DESC LIMIT 1`,
    materialId,
    start.toISOString()
  );

  const byDay = new Map(rows.map((r) => [r.day, r.balance]));
  const result: BalancePoint[] = [];
  let running = before?.balance ?? 0;

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
  return queryAll(
    `SELECT fs.foreman_id AS "foremanId", f.name AS "foremanName", f.brigade, fs.quantity
       FROM foreman_stock fs
       JOIN foremen f ON f.id = fs.foreman_id
      WHERE fs.material_id = ? AND fs.quantity > 0
      ORDER BY fs.quantity DESC`,
    materialId
  );
}

/** Итоги по материалу за всё время — сколько принято, выдано, израсходовано, возвращено. */
export async function getMaterialTotals(materialId: string): Promise<{
  received: number;
  issued: number;
  used: number;
  returned: number;
}> {
  return (
    await queryOne<{ received: number; issued: number; used: number; returned: number }>(
      `SELECT COALESCE(SUM(CASE WHEN type = 'RECEIPT' THEN quantity END), 0) AS received,
              COALESCE(SUM(CASE WHEN type = 'ISSUE'   THEN quantity END), 0) AS issued,
              COALESCE(SUM(CASE WHEN type = 'USAGE'   THEN quantity END), 0) AS used,
              COALESCE(SUM(CASE WHEN type = 'RETURN'  THEN quantity END), 0) AS returned
         FROM stock_movements WHERE material_id = ?`,
      materialId
    ) ?? { received: 0, issued: 0, used: 0, returned: 0 }
  );
}

/* ------------------------------------------------------------------ */
/* Объекты                                                             */
/* ------------------------------------------------------------------ */

export interface ProjectSummary {
  projectId: string;
  foremenCount: number;
  /** Сколько разных материалов проходило через объект. */
  materialCount: number;
  issueCount: number;
  usageCount: number;
  movementCount: number;
  lastOperationAt: string | null;
}

export async function getProjectSummaries(): Promise<Map<string, ProjectSummary>> {
  const rows = await queryAll<ProjectSummary>(
    `SELECT p.id AS "projectId",
            (SELECT COUNT(*)::int FROM foremen f WHERE f.project_id = p.id AND f.is_active = 1) AS "foremenCount",
            (SELECT COUNT(DISTINCT material_id)::int FROM stock_movements WHERE project_id = p.id) AS "materialCount",
            (SELECT COUNT(*)::int FROM stock_movements WHERE project_id = p.id AND type = 'ISSUE') AS "issueCount",
            (SELECT COUNT(*)::int FROM stock_movements WHERE project_id = p.id AND type = 'USAGE') AS "usageCount",
            (SELECT COUNT(*)::int FROM stock_movements WHERE project_id = p.id) AS "movementCount",
            (SELECT MAX(occurred_at) FROM stock_movements WHERE project_id = p.id) AS "lastOperationAt"
       FROM projects p`
  );
  return new Map(rows.map((r) => [r.projectId, r]));
}

export async function getProject(id: string): Promise<Project | null> {
  const row = await queryOne<{
    id: string;
    name: string;
    address: string;
    is_active: number;
    created_at: string;
  }>("SELECT id, name, address, is_active, created_at FROM projects WHERE id = ?", id);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

/** Сколько какого материала ушло на объект — основа отчёта по объекту. */
export async function getProjectMaterialTotals(
  projectId: string
): Promise<{ materialId: string; materialName: string; unit: string; issued: number; used: number }[]> {
  return queryAll(
    `SELECT sm.material_id AS "materialId", m.name AS "materialName", m.unit,
            COALESCE(SUM(CASE WHEN sm.type = 'ISSUE' THEN sm.quantity END), 0) AS issued,
            COALESCE(SUM(CASE WHEN sm.type = 'USAGE' THEN sm.quantity END), 0) AS used
       FROM stock_movements sm
       JOIN materials m ON m.id = sm.material_id
      WHERE sm.project_id = ?
      GROUP BY sm.material_id, m.name, m.unit
      HAVING COALESCE(SUM(CASE WHEN sm.type = 'ISSUE' THEN sm.quantity END), 0) > 0
          OR COALESCE(SUM(CASE WHEN sm.type = 'USAGE' THEN sm.quantity END), 0) > 0
      ORDER BY lower(m.name)`,
    projectId
  );
}

/* ------------------------------------------------------------------ */
/* Отчёты                                                              */
/* ------------------------------------------------------------------ */

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

/**
 * Сводный отчёт «остатки и обороты за период».
 * Обороты считаются по журналу движений, остатки берутся текущие —
 * это то, что нужно кладовщику для сверки.
 */
export async function getStockReport(fromIso?: string, toIso?: string): Promise<StockReportRow[]> {
  const params: SqlParam[] = [];
  let periodClause = "";
  if (fromIso) {
    periodClause += " AND sm.occurred_at >= ?";
    params.push(fromIso);
  }
  if (toIso) {
    periodClause += " AND sm.occurred_at <= ?";
    params.push(toIso);
  }

  // Параметры повторяются для каждого из четырёх подсчётов оборота.
  const repeated = [...params, ...params, ...params, ...params];

  return await queryAll<StockReportRow>(
    `SELECT m.id AS "materialId", m.name AS "materialName", m.category, m.unit,
            m.quantity AS "atWarehouse",
            COALESCE((SELECT SUM(quantity) FROM foreman_stock WHERE material_id = m.id), 0) AS "atForemen",
            m.quantity + COALESCE((SELECT SUM(quantity) FROM foreman_stock WHERE material_id = m.id), 0) AS total,
            m.min_stock AS "minStock",
            COALESCE((SELECT SUM(sm.quantity) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'RECEIPT'${periodClause}), 0) AS received,
            COALESCE((SELECT SUM(sm.quantity) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'ISSUE'${periodClause}), 0) AS issued,
            COALESCE((SELECT SUM(sm.quantity) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'USAGE'${periodClause}), 0) AS used,
            COALESCE((SELECT SUM(sm.quantity) FROM stock_movements sm WHERE sm.material_id = m.id AND sm.type = 'RETURN'${periodClause}), 0) AS returned
       FROM materials m
      WHERE m.is_active = 1
      ORDER BY lower(m.name)`,
    ...repeated
  );
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
export async function getForemanReport(fromIso?: string, toIso?: string): Promise<ForemanReportRow[]> {
  const params: SqlParam[] = [];
  let periodClause = "";
  if (fromIso) {
    periodClause += " AND sm.occurred_at >= ?";
    params.push(fromIso);
  }
  if (toIso) {
    periodClause += " AND sm.occurred_at <= ?";
    params.push(toIso);
  }

  return await queryAll<ForemanReportRow>(
    `SELECT sm.foreman_id || ':' || sm.material_id AS "rowId",
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
      WHERE sm.foreman_id IS NOT NULL${periodClause}
      GROUP BY sm.foreman_id, sm.material_id, f.name, f.brigade, p.name, m.name, m.unit
      ORDER BY lower(f.name), lower(m.name)`,
    ...params
  );
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

/**
 * Отчёт «расход материалов по объектам»: одна строка — объект и материал,
 * с собственной единицей измерения.
 */
export async function getProjectReport(fromIso?: string, toIso?: string): Promise<ProjectReportRow[]> {
  const params: SqlParam[] = [];
  let periodClause = "";
  if (fromIso) {
    periodClause += " AND sm.occurred_at >= ?";
    params.push(fromIso);
  }
  if (toIso) {
    periodClause += " AND sm.occurred_at <= ?";
    params.push(toIso);
  }

  return await queryAll<ProjectReportRow>(
    `SELECT sm.project_id || ':' || sm.material_id AS "rowId",
            p.name AS "projectName", p.address, m.name AS "materialName", m.unit,
            COALESCE(SUM(CASE WHEN sm.type = 'ISSUE' THEN sm.quantity END), 0) AS issued,
            COALESCE(SUM(CASE WHEN sm.type = 'USAGE' THEN sm.quantity END), 0) AS used,
            COALESCE(SUM(CASE WHEN sm.type = 'ISSUE' THEN sm.quantity END), 0)
              - COALESCE(SUM(CASE WHEN sm.type = 'USAGE' THEN sm.quantity END), 0) AS remaining
       FROM stock_movements sm
       JOIN projects p  ON p.id = sm.project_id
       JOIN materials m ON m.id = sm.material_id
      WHERE sm.project_id IS NOT NULL${periodClause}
      GROUP BY sm.project_id, sm.material_id, p.name, p.address, m.name, m.unit
      ORDER BY lower(p.name), lower(m.name)`,
    ...params
  );
}

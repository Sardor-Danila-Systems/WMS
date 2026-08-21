import "@/lib/server-only";

import { randomUUID } from "node:crypto";

import { execute, getDb, queryAll, queryOne, transaction } from "./client";
import { createRng, pick, randInt } from "./rng";
import { MATERIALS_SEED } from "./seed-materials";
import { FOREMEN_SEED, PROJECTS_SEED, SUPPLIERS_SEED, USERS_SEED } from "./seed-people";
import { hashPassword } from "@/lib/auth/password";
import { recordMovementInTx } from "@/server/movements";
import { BusinessError } from "@/server/errors";
import type { Unit } from "@/types";

/** Типичный объём одной поставки по единицам измерения — чтобы числа выглядели правдоподобно. */
const RECEIPT_RANGE: Record<Unit, [number, number]> = {
  "т": [2, 12],
  "м³": [8, 30],
  "шт": [200, 4000],
  "кг": [30, 200],
  "л": [40, 200],
  "уп": [15, 100],
  "м": [80, 500],
  "м²": [50, 300],
  "рулон": [8, 40],
};

const RECEIPT_COMMENTS = [
  "Поставка по графику",
  "Досрочная поставка от поставщика",
  "Плановое пополнение склада",
  "",
  "",
  "Дозаказ по заявке прораба",
];

const ISSUE_COMMENTS = [
  "Выдано под фундаментные работы",
  "Выдано для отделочных работ",
  "Выдано на объект",
  "",
  "",
  "Срочная выдача по заявке бригадира",
];

const USAGE_COMMENTS = [
  "Списано по факту выполненных работ",
  "Израсходовано на захватке",
  "",
  "",
  "Закрыт объём за смену",
];

const RETURN_REASONS = ["Излишек на объекте", "Брак/повреждение", "Неверный материал", "Отмена работ"];

const PLATE_LETTERS = ["А", "В", "Е", "К", "М", "Н", "О", "Р", "С", "Т", "У", "Х"];
const PLATE_REGIONS = ["77", "78", "50", "190", "152", "66", "23"];

function generatePlate(rng: () => number): string {
  return `${pick(rng, PLATE_LETTERS)}${randInt(rng, 100, 999)}${pick(rng, PLATE_LETTERS)}${pick(
    rng,
    PLATE_LETTERS
  )} ${pick(rng, PLATE_REGIONS)}`;
}

function roundForUnit(unit: string, value: number): number {
  if (unit === "шт" || unit === "м" || unit === "м²") return Math.max(1, Math.round(value));
  return Math.max(0.1, Math.round(value * 10) / 10);
}

const DAYS_OF_HISTORY = 45;

export function isDatabaseSeeded(): boolean {
  const row = queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM users");
  return (row?.c ?? 0) > 0;
}

export interface SeedOptions {
  /** Стереть существующие данные перед заполнением. */
  reset?: boolean;
  /** Завести только справочники и учётные записи, без истории операций. */
  skipHistory?: boolean;
}

export interface SeedResult {
  users: number;
  projects: number;
  suppliers: number;
  foremen: number;
  materials: number;
  movements: number;
}

/**
 * Наполняет базу демонстрационными, но реалистичными данными.
 *
 * История операций создаётся тем же кодом, что и работа пользователя
 * (`recordMovementInTx`), поэтому сгенерированные остатки по определению
 * согласованы с журналом движений — никаких «нарисованных» чисел.
 */
export function seedDatabase(options: SeedOptions = {}): SeedResult {
  return transaction(() => {
    if (options.reset) {
      // Порядок важен: сначала зависимые таблицы, потом справочники.
      for (const table of [
        "stock_movements",
        "foreman_stock",
        "sessions",
        "foremen",
        "materials",
        "projects",
        "suppliers",
        "users",
        "settings",
      ]) {
        execute(`DELETE FROM ${table}`);
      }
    }

    const now = new Date().toISOString();
    const rng = createRng(20260821);

    /* --- Учётные записи ------------------------------------------------ */
    const userIds: string[] = [];
    for (const user of USERS_SEED) {
      const id = randomUUID();
      execute(
        `INSERT INTO users (id, username, password_hash, full_name, position, phone, role, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        id,
        user.username,
        hashPassword(user.password),
        user.fullName,
        user.position,
        user.phone,
        user.role,
        now
      );
      userIds.push(id);
    }

    /* --- Объекты ------------------------------------------------------- */
    const projectIds: string[] = [];
    for (const project of PROJECTS_SEED) {
      const id = randomUUID();
      execute(
        "INSERT INTO projects (id, name, address, is_active, created_at) VALUES (?, ?, ?, 1, ?)",
        id,
        project.name,
        project.address,
        now
      );
      projectIds.push(id);
    }

    /* --- Поставщики ---------------------------------------------------- */
    const supplierIds: string[] = [];
    for (const supplier of SUPPLIERS_SEED) {
      const id = randomUUID();
      execute(
        "INSERT INTO suppliers (id, name, contact, is_active, created_at) VALUES (?, ?, ?, 1, ?)",
        id,
        supplier.name,
        supplier.contact,
        now
      );
      supplierIds.push(id);
    }

    /* --- Бригадиры ----------------------------------------------------- */
    const foremanIds: string[] = [];
    const foremanProject = new Map<string, string>();
    for (const foreman of FOREMEN_SEED) {
      const id = randomUUID();
      const projectId = projectIds[foreman.projectIndex] ?? null;
      execute(
        "INSERT INTO foremen (id, name, phone, brigade, project_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
        id,
        foreman.name,
        foreman.phone,
        foreman.brigade,
        projectId,
        now
      );
      foremanIds.push(id);
      if (projectId) foremanProject.set(id, projectId);
    }

    /* --- Материалы ----------------------------------------------------- */
    const materialIds: string[] = [];
    const materialById = new Map<string, { unit: string; minStock: number }>();
    const createdAt = new Date(Date.now() - DAYS_OF_HISTORY * 86_400_000).toISOString();
    for (const material of MATERIALS_SEED) {
      const id = randomUUID();
      execute(
        `INSERT INTO materials (id, name, category, unit, quantity, min_stock, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, 1, ?, ?)`,
        id,
        material.name,
        material.category,
        material.unit,
        material.minStock,
        createdAt,
        createdAt
      );
      materialIds.push(id);
      materialById.set(id, { unit: material.unit, minStock: material.minStock });
    }

    const base: SeedResult = {
      users: userIds.length,
      projects: projectIds.length,
      suppliers: supplierIds.length,
      foremen: foremanIds.length,
      materials: materialIds.length,
      movements: 0,
    };

    if (options.skipHistory) return base;

    /* --- История движений ---------------------------------------------- */
    const today = new Date();
    today.setHours(9, 0, 0, 0);

    // Локальные копии остатков, чтобы подбирать заведомо допустимые количества.
    const warehouse = new Map<string, number>(materialIds.map((id) => [id, 0]));
    const atForeman = new Map<string, number>(); // ключ: `${foremanId}:${materialId}`

    let movements = 0;
    const record = (input: Parameters<typeof recordMovementInTx>[0]) => {
      try {
        recordMovementInTx(input);
        movements++;
        return true;
      } catch (error) {
        // Сгенерированная операция могла не сойтись по остатку — просто пропускаем её.
        if (error instanceof BusinessError) return false;
        throw error;
      }
    };

    // Стартовое наполнение склада: каждая позиция получает начальный остаток.
    const openingDate = new Date(today);
    openingDate.setDate(openingDate.getDate() - DAYS_OF_HISTORY - 1);
    for (const materialId of materialIds) {
      const meta = materialById.get(materialId)!;
      const qty = roundForUnit(meta.unit, meta.minStock * (2.5 + rng() * 2.5));
      if (
        record({
          type: "RECEIPT",
          materialId,
          quantity: qty,
          userId: userIds[0],
          occurredAt: openingDate.toISOString(),
          supplierId: pick(rng, supplierIds),
          comment: "Начальный остаток при вводе системы в работу",
        })
      ) {
        warehouse.set(materialId, qty);
      }
    }

    for (let dayOffset = DAYS_OF_HISTORY; dayOffset >= 0; dayOffset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      const weekday = date.getDay();
      const isWeekend = weekday === 0 || weekday === 6;
      const opsToday = isWeekend ? randInt(rng, 0, 2) : randInt(rng, 4, 9);

      for (let i = 0; i < opsToday; i++) {
        const userId = pick(rng, userIds);
        const opDate = new Date(date);
        opDate.setHours(randInt(rng, 8, 17), randInt(rng, 0, 59), 0, 0);
        const occurredAt = opDate.toISOString();

        // Позиции, которые реально лежат у бригадиров — только по ним возможны
        // использование и возврат.
        const heldPairs = [...atForeman.entries()].filter(([, qty]) => qty > 0);
        const roll = rng();

        if (roll < 0.32) {
          // Поступление
          const materialId = pick(rng, materialIds);
          const unit = materialById.get(materialId)!.unit as Unit;
          const [min, max] = RECEIPT_RANGE[unit];
          const qty = roundForUnit(unit, randInt(rng, min, max));
          if (
            record({
              type: "RECEIPT",
              materialId,
              quantity: qty,
              userId,
              occurredAt,
              supplierId: pick(rng, supplierIds),
              vehicleNumber: generatePlate(rng),
              comment: pick(rng, RECEIPT_COMMENTS),
            })
          ) {
            warehouse.set(materialId, (warehouse.get(materialId) ?? 0) + qty);
          }
        } else if (roll < 0.6 || heldPairs.length === 0) {
          // Выдача бригадиру (и запасной вариант, пока ни у кого ничего нет на руках)
          const materialId = pick(rng, materialIds);
          const unit = materialById.get(materialId)!.unit as Unit;
          const stock = warehouse.get(materialId) ?? 0;
          if (stock <= 0) continue;
          const foremanId = pick(rng, foremanIds);
          const [min, max] = RECEIPT_RANGE[unit];
          const qty = Math.min(roundForUnit(unit, randInt(rng, min, max) * 0.35), stock);
          if (qty <= 0) continue;
          if (
            record({
              type: "ISSUE",
              materialId,
              quantity: qty,
              userId,
              foremanId,
              projectId: foremanProject.get(foremanId) ?? null,
              occurredAt,
              comment: pick(rng, ISSUE_COMMENTS),
            })
          ) {
            warehouse.set(materialId, stock - qty);
            const key = `${foremanId}:${materialId}`;
            atForeman.set(key, (atForeman.get(key) ?? 0) + qty);
          }
        } else if (roll < 0.87) {
          // Использование на объекте — списываем с того, что действительно на руках.
          const [key, held] = pick(rng, heldPairs);
          const [foremanId, materialId] = key.split(":");
          const unit = materialById.get(materialId)!.unit as Unit;
          const qty = Math.min(roundForUnit(unit, held * (0.35 + rng() * 0.5)), held);
          if (qty <= 0) continue;
          if (
            record({
              type: "USAGE",
              materialId,
              quantity: qty,
              userId,
              foremanId,
              projectId: foremanProject.get(foremanId) ?? null,
              occurredAt,
              comment: pick(rng, USAGE_COMMENTS),
            })
          ) {
            atForeman.set(key, held - qty);
          }
        } else {
          // Возврат на склад — тоже только из фактического остатка бригадира.
          const [key, held] = pick(rng, heldPairs);
          const [foremanId, materialId] = key.split(":");
          const unit = materialById.get(materialId)!.unit as Unit;
          const qty = Math.min(roundForUnit(unit, held * (0.2 + rng() * 0.5)), held);
          if (qty <= 0) continue;
          if (
            record({
              type: "RETURN",
              materialId,
              quantity: qty,
              userId,
              foremanId,
              occurredAt,
              reason: pick(rng, RETURN_REASONS),
            })
          ) {
            warehouse.set(materialId, (warehouse.get(materialId) ?? 0) + qty);
            atForeman.set(key, held - qty);
          }
        }
      }
    }

    execute(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
      "company_name",
      "ООО «СтройХолдинг»"
    );
    execute(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
      "warehouse_address",
      "г. Москва, Складской проезд, д. 12"
    );

    return { ...base, movements };
  });
}

/** Заполняет базу при первом запуске, если она пустая. */
export function ensureSeeded(): void {
  if (!isDatabaseSeeded()) {
    seedDatabase();
  }
}

/** Диагностика для скриптов: сводка по содержимому базы. */
export function describeDatabase(): Record<string, number> {
  const tables = ["users", "projects", "suppliers", "foremen", "materials", "stock_movements", "foreman_stock"];
  const result: Record<string, number> = {};
  for (const table of tables) {
    result[table] = queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM ${table}`)?.c ?? 0;
  }
  return result;
}

export function listTableNames(): string[] {
  getDb();
  return queryAll<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'").map((r) => r.name);
}

import "@/lib/server-only";

import { db, transaction } from "./client";
import { createRng, pick, randInt } from "./rng";
import { MATERIALS_SEED } from "./seed-materials";
import { FOREMEN_SEED, PROJECTS_SEED, SUPPLIERS_SEED, USERS_SEED } from "./seed-people";
import { hashPassword } from "@/lib/auth/password";
import { recordMovement } from "@/server/movements";
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

export async function isDatabaseSeeded(): Promise<boolean> {
  return (await db.user.count()) > 0;
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
export async function seedDatabase(options: SeedOptions = {}): Promise<SeedResult> {
  const rng = createRng(20260821);

  const base = await transaction(async (tx) => {
    if (options.reset) {
      // Порядок важен: сначала зависимые таблицы, потом справочники.
      // Порядок важен: сначала зависимые таблицы, потом справочники.
      await tx.stockMovement.deleteMany();
      await tx.foremanStock.deleteMany();
      await tx.session.deleteMany();
      await tx.foreman.deleteMany();
      await tx.material.deleteMany();
      await tx.project.deleteMany();
      await tx.supplier.deleteMany();
      await tx.user.deleteMany();
      await tx.setting.deleteMany();
    }


    /* --- Учётные записи ------------------------------------------------ */
    const userIds: string[] = [];
    for (const user of USERS_SEED) {
      const created = await tx.user.create({
        data: {
          username: user.username,
          passwordHash: hashPassword(user.password),
          fullName: user.fullName,
          position: user.position,
          phone: user.phone,
          role: user.role,
        },
        select: { id: true },
      });
      userIds.push(created.id);
    }

    /* --- Объекты ------------------------------------------------------- */
    const projectIds: string[] = [];
    for (const project of PROJECTS_SEED) {
      const created = await tx.project.create({
        data: { name: project.name, address: project.address },
        select: { id: true },
      });
      projectIds.push(created.id);
    }

    /* --- Поставщики ---------------------------------------------------- */
    const supplierIds: string[] = [];
    for (const supplier of SUPPLIERS_SEED) {
      const created = await tx.supplier.create({
        data: { name: supplier.name, contact: supplier.contact },
        select: { id: true },
      });
      supplierIds.push(created.id);
    }

    /* --- Бригадиры ----------------------------------------------------- */
    const foremanIds: string[] = [];
    const foremanProject = new Map<string, string>();
    for (const foreman of FOREMEN_SEED) {
      const projectId = projectIds[foreman.projectIndex] ?? null;
      const created = await tx.foreman.create({
        data: {
          name: foreman.name,
          phone: foreman.phone,
          brigade: foreman.brigade,
          projectId,
        },
        select: { id: true },
      });
      foremanIds.push(created.id);
      if (projectId) foremanProject.set(created.id, projectId);
    }

    /* --- Материалы ----------------------------------------------------- */
    const materialIds: string[] = [];
    const materialById = new Map<string, { unit: string; minStock: number }>();
    const createdAt = new Date(Date.now() - DAYS_OF_HISTORY * 86_400_000);
    for (const material of MATERIALS_SEED) {
      const created = await tx.material.create({
        data: {
          name: material.name,
          category: material.category,
          unit: material.unit,
          quantity: 0,
          minStock: material.minStock,
          createdAt,
        },
        select: { id: true },
      });
      materialIds.push(created.id);
      materialById.set(created.id, { unit: material.unit, minStock: material.minStock });
    }

    return {
      userIds,
      projectIds,
      supplierIds,
      foremanIds,
      foremanProject,
      materialIds,
      materialById,
    };
  });

  const { userIds, projectIds, supplierIds, foremanIds, foremanProject, materialIds, materialById } =
    base;

  const result: SeedResult = {
    users: userIds.length,
    projects: projectIds.length,
    suppliers: supplierIds.length,
    foremen: foremanIds.length,
    materials: materialIds.length,
    movements: 0,
  };

  {
    if (options.skipHistory) return result;

    /* --- История движений ---------------------------------------------- */
    const today = new Date();
    today.setHours(9, 0, 0, 0);

    // Локальные копии остатков, чтобы подбирать заведомо допустимые количества.
    const warehouse = new Map<string, number>(materialIds.map((id) => [id, 0]));
    const atForeman = new Map<string, number>(); // ключ: `${foremanId}:${materialId}`

    let movements = 0;
    // Каждое движение пишется своей транзакцией: одна общая транзакция на
    // сотни операций по сети упирается в таймаут, а по отдельности каждая
    // операция остаётся неделимой — этого и требует учёт.
    const record = async (input: Parameters<typeof recordMovement>[0]) => {
      try {
        await recordMovement(input);
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
        await record({
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
            await record({
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
            await record({
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
            await record({
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
            await record({
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

    for (const [key, value] of [
      ["company_name", "Gagarin Avenue"],
      ["warehouse_address", "Toshkent sh., Gagarin ko'chasi, 12"],
    ] as const) {
      await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }

    result.movements = movements;
    return result;
  }
}

/** Заполняет базу при первом запуске, если она пустая. */
export async function ensureSeeded(): Promise<void> {
  if (!(await isDatabaseSeeded())) {
    await seedDatabase();
  }
}

/** Диагностика для скриптов: сводка по содержимому базы. */
export async function describeDatabase(): Promise<Record<string, number>> {
  const [users, projects, suppliers, foremen, materials, movements, foremanStock] = await Promise.all([
    db.user.count(),
    db.project.count(),
    db.supplier.count(),
    db.foreman.count(),
    db.material.count(),
    db.stockMovement.count(),
    db.foremanStock.count(),
  ]);
  return { users, projects, suppliers, foremen, materials, movements, foremanStock };
}

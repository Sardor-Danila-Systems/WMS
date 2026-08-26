import "@/lib/server-only";

import { db, transaction } from "./client";
import { createRng, pick, randInt } from "./rng";
import { DEMO_PRICE_BY_UNIT, MATERIALS_SEED } from "./seed-materials";
import { BLOCKS_SEED, ORGANIZATIONS_SEED, SUPPLIERS_SEED, USERS_SEED } from "./seed-people";
import { hashPassword } from "@/lib/auth/password";
import { recordMovement } from "@/server/movements";
import { BusinessError } from "@/server/errors";
import { roundMoney } from "@/lib/validation";
import type { PaymentMethod, Unit } from "@/types";

/** Типичный объём одной поставки по единицам измерения — чтобы числа выглядели правдоподобно. */
const RECEIPT_RANGE: Record<Unit, [number, number]> = {
  "шт": [200, 4000],
  "кг": [30, 200],
  "метр": [80, 500],
  "комплект": [5, 40],
  "мешок": [50, 400],
  "м²": [50, 300],
  "м³": [8, 30],
  "т": [2, 12],
  "л": [40, 200],
  "рулон": [8, 40],
  "упаковка": [15, 100],
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
  "Выдано на блок",
  "",
  "",
  "Срочная выдача по заявке бригады",
];

const RETURN_REASONS = ["Излишек на объекте", "Брак/повреждение", "Неверный материал", "Отмена работ"];

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "TRANSFER"];

const PLATE_LETTERS = ["A", "B", "C", "D", "E", "H", "K", "L", "M", "N", "P", "X", "Z"];
const PLATE_REGIONS = ["01", "10", "20", "30", "40", "50", "60", "66", "70", "80", "90"];

/** Узбекский номер вида «30 X 124 LA». */
function generatePlate(rng: () => number): string {
  return `${pick(rng, PLATE_REGIONS)} ${pick(rng, PLATE_LETTERS)} ${randInt(rng, 100, 999)} ${pick(
    rng,
    PLATE_LETTERS
  )}${pick(rng, PLATE_LETTERS)}`;
}

function roundForUnit(unit: string, value: number): number {
  if (unit === "шт" || unit === "метр" || unit === "м²" || unit === "мешок" || unit === "комплект") {
    return Math.max(1, Math.round(value));
  }
  return Math.max(0.1, Math.round(value * 10) / 10);
}

/** Цена «как в жизни»: круглая, с разбросом внутри диапазона для единицы. */
function demoPrice(rng: () => number, unit: Unit): number {
  const [min, max] = DEMO_PRICE_BY_UNIT[unit];
  const raw = min + rng() * (max - min);
  const step = raw > 1_000_000 ? 50_000 : raw > 100_000 ? 5_000 : 500;
  return Math.max(step, Math.round(raw / step) * step);
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
  organizations: number;
  suppliers: number;
  blocks: number;
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
      await tx.stockMovement.deleteMany();
      await tx.blockStock.deleteMany();
      await tx.session.deleteMany();
      await tx.block.deleteMany();
      await tx.material.deleteMany();
      await tx.organization.deleteMany();
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

    /* --- Организации --------------------------------------------------- */
    const organizationIds: string[] = [];
    for (const organization of ORGANIZATIONS_SEED) {
      const created = await tx.organization.create({
        data: organization,
        select: { id: true },
      });
      organizationIds.push(created.id);
    }

    /* --- Поставщики ---------------------------------------------------- */
    const supplierIds: string[] = [];
    for (const supplier of SUPPLIERS_SEED) {
      const created = await tx.supplier.create({ data: supplier, select: { id: true } });
      supplierIds.push(created.id);
    }

    /* --- Блоки --------------------------------------------------------- */
    const blockIds: string[] = [];
    for (const block of BLOCKS_SEED) {
      const created = await tx.block.create({
        data: {
          name: block.name,
          description: block.description,
          sortOrder: block.sortOrder,
          organizationId: organizationIds[0] ?? null,
        },
        select: { id: true },
      });
      blockIds.push(created.id);
    }

    /* --- Материалы ----------------------------------------------------- */
    const materialIds: string[] = [];
    const materialById = new Map<string, { unit: Unit; minStock: number; price: number }>();
    const createdAt = new Date(Date.now() - DAYS_OF_HISTORY * 86_400_000);
    for (const material of MATERIALS_SEED) {
      const price = demoPrice(rng, material.unit);
      const created = await tx.material.create({
        data: {
          name: material.name,
          category: material.category,
          unit: material.unit,
          quantity: 0,
          price,
          minStock: material.minStock,
          createdAt,
        },
        select: { id: true },
      });
      materialIds.push(created.id);
      materialById.set(created.id, { unit: material.unit, minStock: material.minStock, price });
    }

    return { userIds, organizationIds, supplierIds, blockIds, materialIds, materialById };
  });

  const { userIds, organizationIds, supplierIds, blockIds, materialIds, materialById } = base;
  const organizationId = organizationIds[0] ?? null;

  const result: SeedResult = {
    users: userIds.length,
    organizations: organizationIds.length,
    suppliers: supplierIds.length,
    blocks: blockIds.length,
    materials: materialIds.length,
    movements: 0,
  };

  if (options.skipHistory) return result;

  /* --- История движений ------------------------------------------------ */
  const today = new Date();
  today.setHours(9, 0, 0, 0);

  // Локальные копии остатков, чтобы подбирать заведомо допустимые количества.
  const warehouse = new Map<string, number>(materialIds.map((id) => [id, 0]));
  const atBlock = new Map<string, number>(); // ключ: `${blockId}:${materialId}`
  // Цена меняется от поставки к поставке — иначе история цен была бы плоской.
  const currentPrice = new Map<string, number>(
    materialIds.map((id) => [id, materialById.get(id)!.price])
  );

  let invoiceCounter = 16_000;
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
        unitPrice: meta.price,
        userId: userIds[0],
        occurredAt: openingDate.toISOString(),
        supplierId: pick(rng, supplierIds),
        organizationId,
        invoiceNumber: String(++invoiceCounter),
        paymentMethod: "TRANSFER",
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
    const isWeekend = weekday === 0;
    const opsToday = isWeekend ? randInt(rng, 0, 2) : randInt(rng, 4, 9);

    for (let i = 0; i < opsToday; i++) {
      const userId = pick(rng, userIds);
      const opDate = new Date(date);
      opDate.setHours(randInt(rng, 8, 17), randInt(rng, 0, 59), 0, 0);
      const occurredAt = opDate.toISOString();

      // Позиции, которые реально числятся за блоками — только по ним возможен возврат.
      const heldPairs = [...atBlock.entries()].filter(([, qty]) => qty > 0);
      const roll = rng();

      if (roll < 0.4) {
        // Приход от поставщика
        const materialId = pick(rng, materialIds);
        const unit = materialById.get(materialId)!.unit;
        const [min, max] = RECEIPT_RANGE[unit];
        const qty = roundForUnit(unit, randInt(rng, min, max));
        // Цена гуляет в пределах ±8% — так выглядит реальная закупка.
        const price = roundMoney(currentPrice.get(materialId)! * (0.92 + rng() * 0.16));
        if (
          await record({
            type: "RECEIPT",
            materialId,
            quantity: qty,
            unitPrice: price,
            userId,
            occurredAt,
            supplierId: pick(rng, supplierIds),
            organizationId,
            invoiceNumber: String(++invoiceCounter),
            vehicleNumber: generatePlate(rng),
            paymentMethod: pick(rng, PAYMENT_METHODS),
            comment: pick(rng, RECEIPT_COMMENTS),
          })
        ) {
          warehouse.set(materialId, (warehouse.get(materialId) ?? 0) + qty);
          currentPrice.set(materialId, price);
        }
      } else if (roll < 0.88 || heldPairs.length === 0) {
        // Расход в блок (и запасной вариант, пока за блоками ничего не числится)
        const materialId = pick(rng, materialIds);
        const unit = materialById.get(materialId)!.unit;
        const stock = warehouse.get(materialId) ?? 0;
        if (stock <= 0) continue;
        const blockId = pick(rng, blockIds);
        const [min, max] = RECEIPT_RANGE[unit];
        const qty = Math.min(roundForUnit(unit, randInt(rng, min, max) * 0.35), stock);
        if (qty <= 0) continue;
        if (
          await record({
            type: "ISSUE",
            materialId,
            quantity: qty,
            unitPrice: currentPrice.get(materialId),
            userId,
            blockId,
            organizationId,
            occurredAt,
            comment: pick(rng, ISSUE_COMMENTS),
          })
        ) {
          warehouse.set(materialId, stock - qty);
          const key = `${blockId}:${materialId}`;
          atBlock.set(key, (atBlock.get(key) ?? 0) + qty);
        }
      } else {
        // Возврат на склад — только из фактического остатка блока.
        const [key, held] = pick(rng, heldPairs);
        const [blockId, materialId] = key.split(":");
        const unit = materialById.get(materialId)!.unit;
        const qty = Math.min(roundForUnit(unit, held * (0.2 + rng() * 0.5)), held);
        if (qty <= 0) continue;
        if (
          await record({
            type: "RETURN",
            materialId,
            quantity: qty,
            userId,
            blockId,
            organizationId,
            occurredAt,
            reason: pick(rng, RETURN_REASONS),
          })
        ) {
          warehouse.set(materialId, (warehouse.get(materialId) ?? 0) + qty);
          atBlock.set(key, held - qty);
        }
      }
    }
  }

  for (const [key, value] of [
    ["company_name", "Gagarin Avenue"],
    ["warehouse_address", "Samarqand sh., Gagarin ko'chasi, 12"],
    ["currency", "сум"],
  ] as const) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  result.movements = movements;
  return result;
}

/** Заполняет базу при первом запуске, если она пустая. */
export async function ensureSeeded(): Promise<void> {
  if (!(await isDatabaseSeeded())) {
    await seedDatabase();
  }
}

/** Диагностика для скриптов: сводка по содержимому базы. */
export async function describeDatabase(): Promise<Record<string, number>> {
  const [users, organizations, suppliers, blocks, materials, movements, blockStock] =
    await Promise.all([
      db.user.count(),
      db.organization.count(),
      db.supplier.count(),
      db.block.count(),
      db.material.count(),
      db.stockMovement.count(),
      db.blockStock.count(),
    ]);
  return { users, organizations, suppliers, blocks, materials, movements, blockStock };
}

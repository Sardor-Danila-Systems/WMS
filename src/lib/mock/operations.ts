import type { Material, Operation, OperationType, ReturnReason, Unit } from "@/types";
import { MATERIALS_SEED } from "./materials";
import { FOREMEN_SEED, SUPPLIERS_SEED, WORKERS_SEED } from "./people";
import { createRng, pick, randInt } from "./rng";

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

const RETURN_REASONS: ReturnReason[] = [
  "Излишек на объекте",
  "Брак/повреждение",
  "Неверный материал",
  "Отмена работ",
];

const PLATE_LETTERS = ["А", "В", "Е", "К", "М", "Н", "О", "Р", "С", "Т", "У", "Х"];
const PLATE_REGIONS = ["77", "78", "50", "190", "152", "66", "23"];

function generatePlate(rng: () => number): string {
  const l1 = pick(rng, PLATE_LETTERS);
  const digits = randInt(rng, 100, 999);
  const l2 = pick(rng, PLATE_LETTERS);
  const l3 = pick(rng, PLATE_LETTERS);
  const region = pick(rng, PLATE_REGIONS);
  return `${l1}${digits}${l2}${l3} ${region}`;
}

function scaleRange([min, max]: [number, number], factor: number): [number, number] {
  const scaledMin = Math.max(1, Math.round(min * factor));
  const scaledMax = Math.max(scaledMin + 1, Math.round(max * factor));
  return [scaledMin, scaledMax];
}

function roundQuantity(unit: Unit, value: number): number {
  if (unit === "шт" || unit === "м" || unit === "м²") return Math.round(value);
  return Math.round(value * 10) / 10;
}

const DAYS_OF_HISTORY = 45;

export interface SeedResult {
  materials: Material[];
  operations: Operation[];
}

export function generateSeedData(): SeedResult {
  const rng = createRng(20260709);
  const today = new Date();
  today.setHours(9, 0, 0, 0);

  const balances = new Map<string, number>();
  const lastReceiptDate = new Map<string, string>();
  MATERIALS_SEED.forEach((m) => {
    const [min, max] = RECEIPT_RANGE[m.unit];
    const initial = m.minStock * (2.5 + rng() * 2.5) + randInt(rng, min, max);
    balances.set(m.id, roundQuantity(m.unit, initial));
  });

  const operations: Operation[] = [];
  let opCounter = 1;

  for (let dayOffset = DAYS_OF_HISTORY; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const weekday = date.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const opsToday = isWeekend ? randInt(rng, 0, 2) : randInt(rng, 3, 8);

    for (let i = 0; i < opsToday; i++) {
      const material = pick(rng, MATERIALS_SEED);
      const currentBalance = balances.get(material.id) ?? 0;
      const roll = rng();
      let type: OperationType;
      if (roll < 0.38) type = "receipt";
      else if (roll < 0.85) type = "issue";
      else type = "return";

      const opDate = new Date(date);
      opDate.setHours(randInt(rng, 8, 17), randInt(rng, 0, 59), 0, 0);
      const worker = pick(rng, WORKERS_SEED);

      if (type === "receipt") {
        const [min, max] = RECEIPT_RANGE[material.unit];
        const quantity = roundQuantity(material.unit, randInt(rng, min, max));
        const supplier = pick(rng, SUPPLIERS_SEED);
        balances.set(material.id, roundQuantity(material.unit, currentBalance + quantity));
        lastReceiptDate.set(material.id, opDate.toISOString());
        operations.push({
          id: `op-${opCounter++}`,
          type,
          date: opDate.toISOString(),
          materialId: material.id,
          materialName: material.name,
          unit: material.unit,
          quantity,
          workerId: worker.id,
          counterpartyId: supplier.id,
          counterpartyName: supplier.name,
          comment: pick(rng, RECEIPT_COMMENTS),
          vehicleNumber: generatePlate(rng),
        });
      } else if (type === "issue") {
        if (currentBalance <= 0) continue;
        const [min, max] = scaleRange(RECEIPT_RANGE[material.unit], 0.35);
        let quantity = roundQuantity(material.unit, randInt(rng, min, max));
        quantity = Math.min(quantity, currentBalance);
        if (quantity <= 0) continue;
        const foreman = pick(rng, FOREMEN_SEED);
        balances.set(material.id, roundQuantity(material.unit, currentBalance - quantity));
        operations.push({
          id: `op-${opCounter++}`,
          type,
          date: opDate.toISOString(),
          materialId: material.id,
          materialName: material.name,
          unit: material.unit,
          quantity,
          workerId: worker.id,
          counterpartyId: foreman.id,
          counterpartyName: foreman.name,
          comment: pick(rng, ISSUE_COMMENTS),
        });
      } else {
        const [min, max] = scaleRange(RECEIPT_RANGE[material.unit], 0.1);
        const quantity = roundQuantity(material.unit, randInt(rng, min, max));
        const foreman = pick(rng, FOREMEN_SEED);
        balances.set(material.id, roundQuantity(material.unit, currentBalance + quantity));
        operations.push({
          id: `op-${opCounter++}`,
          type,
          date: opDate.toISOString(),
          materialId: material.id,
          materialName: material.name,
          unit: material.unit,
          quantity,
          workerId: worker.id,
          counterpartyId: foreman.id,
          counterpartyName: foreman.name,
          comment: "",
          reason: pick(rng, RETURN_REASONS),
        });
      }
    }
  }

  const materials: Material[] = MATERIALS_SEED.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    unit: m.unit,
    quantity: balances.get(m.id) ?? 0,
    minStock: m.minStock,
    lastReceiptDate: lastReceiptDate.get(m.id) ?? null,
    createdAt: new Date(today.getTime() - DAYS_OF_HISTORY * 86400000).toISOString(),
  }));

  operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { materials, operations };
}

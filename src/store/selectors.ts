import type { Foreman, Material, Operation, OperationType, Worker } from "@/types";
import { getStockStatus } from "@/constants/colors";

function isSameDay(isoDate: string, reference: Date): boolean {
  const d = new Date(isoDate);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

export function countTodayByType(operations: Operation[], type: OperationType, now = new Date()): number {
  return operations.filter((op) => op.type === type && isSameDay(op.date, now)).length;
}

export function getLowStockMaterials(materials: Material[]): Material[] {
  return materials
    .filter((m) => getStockStatus(m.quantity, m.minStock) !== "good")
    .sort((a, b) => a.quantity / a.minStock - b.quantity / b.minStock);
}

export function getRecentOperations(operations: Operation[], count: number): Operation[] {
  return operations.slice(0, count);
}

export function getWorkerOperationCounts(operations: Operation[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const op of operations) {
    map.set(op.workerId, (map.get(op.workerId) ?? 0) + 1);
  }
  return map;
}

export interface ForemanStats {
  issuedCount: number;
  issuedOperations: number;
  returnedCount: number;
  returnedOperations: number;
}

export function getForemanStats(operations: Operation[]): Map<string, ForemanStats> {
  const map = new Map<string, ForemanStats>();
  for (const op of operations) {
    if (op.type !== "issue" && op.type !== "return") continue;
    const current = map.get(op.counterpartyId) ?? {
      issuedCount: 0,
      issuedOperations: 0,
      returnedCount: 0,
      returnedOperations: 0,
    };
    if (op.type === "issue") {
      current.issuedCount += op.quantity;
      current.issuedOperations += 1;
    } else {
      current.returnedCount += op.quantity;
      current.returnedOperations += 1;
    }
    map.set(op.counterpartyId, current);
  }
  return map;
}

export interface DayActivity {
  date: string;
  label: string;
  receipts: number;
  issues: number;
  returns: number;
}

export function getActivityByDay(operations: Operation[], days: number): DayActivity[] {
  const result: DayActivity[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const dayOps = operations.filter((op) => isSameDay(op.date, day));
    result.push({
      date: day.toISOString(),
      label: day.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      receipts: dayOps.filter((op) => op.type === "receipt").length,
      issues: dayOps.filter((op) => op.type === "issue").length,
      returns: dayOps.filter((op) => op.type === "return").length,
    });
  }
  return result;
}

export interface MaterialBalancePoint {
  date: string;
  label: string;
  balance: number;
}

/** Восстанавливает историю остатка материала, «отматывая» операции назад от текущего значения. */
export function getMaterialBalanceHistory(
  operations: Operation[],
  material: Material,
  days: number
): MaterialBalancePoint[] {
  const materialOps = operations
    .filter((op) => op.materialId === material.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let runningBalance = material.quantity;
  const balanceAtDate = new Map<string, number>();

  let opIndex = 0;
  const dayKeys: string[] = [];
  for (let i = 0; i <= days; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    dayKeys.push(day.toISOString());
  }

  // dayKeys идут от сегодня к прошлому; balance записывается ДО отмотки операций дня назад.
  for (const dayKey of dayKeys) {
    const day = new Date(dayKey);
    balanceAtDate.set(dayKey, runningBalance);

    while (opIndex < materialOps.length && new Date(materialOps[opIndex].date) >= day) {
      const op = materialOps[opIndex];
      if (op.type === "receipt" || op.type === "return") {
        runningBalance -= op.quantity;
      } else {
        runningBalance += op.quantity;
      }
      opIndex++;
    }
  }

  return dayKeys
    .slice()
    .reverse()
    .map((key) => ({
      date: key,
      label: new Date(key).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      balance: Math.max(0, Math.round((balanceAtDate.get(key) ?? 0) * 10) / 10),
    }));
}

export function getWorkerById(workers: Worker[], id: string): Worker | undefined {
  return workers.find((w) => w.id === id);
}

export function getForemanById(foremen: Foreman[], id: string): Foreman | undefined {
  return foremen.find((f) => f.id === id);
}

/**
 * Сквозная проверка учёта на отдельной копии базы.
 * Проходит полный жизненный цикл материала и проверяет, что систему
 * нельзя привести в некорректное состояние.
 *
 *   npm run test:e2e
 */
import { rmSync } from "node:fs";
import path from "node:path";

const TEST_DB = path.join(process.cwd(), "data", "test-flow.db");
rmSync(TEST_DB, { force: true });
rmSync(`${TEST_DB}-wal`, { force: true });
rmSync(`${TEST_DB}-shm`, { force: true });
process.env.WMS_DB_PATH = TEST_DB;

const { getDb, queryOne } = await import("@/lib/db/client");
const { seedDatabase } = await import("@/lib/db/seed");
const { recordMovement, verifyLedgerConsistency } = await import("@/server/movements");
const { createMaterial, createForeman, deleteMaterial, updateMaterial } = await import("@/server/catalog");
const { getMaterial, getForemanStock, listMovements } = await import("@/server/queries");
const { BusinessError } = await import("@/server/errors");
const { hashPassword, verifyPassword } = await import("@/lib/auth/password");

getDb();

let passed = 0;
let failed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}: ${actual}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}: получено ${actual}, ожидалось ${expected}`);
  }
}

function checkThrows(label: string, fn: () => unknown) {
  try {
    fn();
    failed++;
    console.error(`  ✗ ${label}: операция прошла, хотя должна была быть отклонена`);
  } catch (error) {
    if (error instanceof BusinessError || error instanceof Error) {
      passed++;
      console.log(`  ✓ ${label}: отклонено — «${(error as Error).message}»`);
    } else {
      failed++;
      console.error(`  ✗ ${label}: неожиданная ошибка`, error);
    }
  }
}

console.log("\nПодготовка: справочники без истории операций");
seedDatabase({ reset: true, skipHistory: true });

const admin = queryOne<{ id: string }>("SELECT id FROM users WHERE username = 'admin'")!;

/**
 * Метки времени операций разносим на минуты вперёд от текущего момента:
 * начальный остаток материала записывается «сейчас», а каждая следующая
 * операция должна идти строго после него — иначе проверка порядка истории
 * зависела бы от того, попали ли две записи в одну миллисекунду.
 */
const start = Date.now();
const at = (minutes: number) => new Date(start + minutes * 60_000).toISOString();
const now = at(60);

/* ================================================================== */
console.log("\nTEST 1 — полный цикл движения материала (Цемент)");
/* ================================================================== */

const { id: cementId } = createMaterial({
  name: "Цемент М500 (тест)",
  category: "Цемент и смеси",
  unit: "мешок",
  minStock: 50,
  initialQuantity: 100,
  userId: admin.id,
});
check("начальный остаток", getMaterial(cementId)!.quantity, 100);

const { id: foremanId } = createForeman({
  name: "Тестовый Бригадир",
  phone: "+7 (900) 000-00-00",
  brigade: "Тестовая бригада",
  projectId: "",
  isActive: true,
});

recordMovement({ type: "RECEIPT", materialId: cementId, quantity: 500, userId: admin.id, occurredAt: at(10) });
check("после поступления +500", getMaterial(cementId)!.quantity, 600);

recordMovement({ type: "ISSUE", materialId: cementId, quantity: 200, userId: admin.id, foremanId, occurredAt: at(20) });
check("склад после выдачи 200", getMaterial(cementId)!.quantity, 400);
check("на руках у бригадира", getForemanStock(foremanId)[0]?.quantity, 200);

recordMovement({ type: "USAGE", materialId: cementId, quantity: 150, userId: admin.id, foremanId, occurredAt: at(30) });
check("склад после использования (не меняется)", getMaterial(cementId)!.quantity, 400);
check("у бригадира после использования 150", getForemanStock(foremanId)[0]?.quantity, 50);

recordMovement({ type: "RETURN", materialId: cementId, quantity: 50, userId: admin.id, foremanId, occurredAt: at(40) });
check("склад после возврата 50", getMaterial(cementId)!.quantity, 450);
check("у бригадира после возврата", getForemanStock(foremanId).length, 0);

const history = listMovements({ materialId: cementId });
check("записей в истории", history.length, 5);
check("типы операций в истории", history.map((m) => m.type).reverse().join(","), "RECEIPT,RECEIPT,ISSUE,USAGE,RETURN");
check("остаток склада в последней записи", history[0].warehouseAfter, 450);

/* ================================================================== */
console.log("\nNEGATIVE TESTS — систему нельзя привести в некорректное состояние");
/* ================================================================== */

checkThrows("нельзя выдать больше остатка склада", () =>
  recordMovement({ type: "ISSUE", materialId: cementId, quantity: 10_000, userId: admin.id, foremanId, occurredAt: now })
);

recordMovement({ type: "ISSUE", materialId: cementId, quantity: 100, userId: admin.id, foremanId, occurredAt: now });

checkThrows("нельзя использовать больше, чем на руках", () =>
  recordMovement({ type: "USAGE", materialId: cementId, quantity: 500, userId: admin.id, foremanId, occurredAt: now })
);

checkThrows("нельзя вернуть больше, чем получено", () =>
  recordMovement({ type: "RETURN", materialId: cementId, quantity: 500, userId: admin.id, foremanId, occurredAt: now })
);

checkThrows("нельзя создать операцию с количеством 0", () =>
  recordMovement({ type: "RECEIPT", materialId: cementId, quantity: 0, userId: admin.id, occurredAt: now })
);

checkThrows("нельзя создать операцию с количеством -10", () =>
  recordMovement({ type: "RECEIPT", materialId: cementId, quantity: -10, userId: admin.id, occurredAt: now })
);

checkThrows("нельзя создать операцию с NaN", () =>
  recordMovement({ type: "RECEIPT", materialId: cementId, quantity: Number.NaN, userId: admin.id, occurredAt: now })
);

checkThrows("нельзя провести операцию по несуществующему материалу", () =>
  recordMovement({ type: "RECEIPT", materialId: "нет-такого", quantity: 5, userId: admin.id, occurredAt: now })
);

checkThrows("выдача без бригадира запрещена", () =>
  recordMovement({ type: "ISSUE", materialId: cementId, quantity: 5, userId: admin.id, occurredAt: now })
);

checkThrows("нельзя удалить материал с историей движений", () => deleteMaterial(cementId));

checkThrows("нельзя изменить единицу измерения после операций", () =>
  updateMaterial(cementId, {
    name: "Цемент М500 (тест)",
    category: "Цемент и смеси",
    unit: "т",
    minStock: 50,
  })
);

/* --- Откат транзакции ---------------------------------------------- */
const beforeFailed = getMaterial(cementId)!.quantity;
const movementsBefore = listMovements({ materialId: cementId }).length;
try {
  recordMovement({ type: "ISSUE", materialId: cementId, quantity: 999_999, userId: admin.id, foremanId, occurredAt: now });
} catch {
  // ожидаемо
}
check("остаток не изменился после отклонённой операции", getMaterial(cementId)!.quantity, beforeFailed);
check("движение не записалось после отклонённой операции", listMovements({ materialId: cementId }).length, movementsBefore);

/* --- Дробные количества --------------------------------------------- */
const { id: sandId } = createMaterial({
  name: "Песок (тест дробных)",
  category: "Нерудные материалы",
  unit: "м³",
  minStock: 5,
  initialQuantity: 0,
  userId: admin.id,
});
recordMovement({ type: "RECEIPT", materialId: sandId, quantity: 0.1, userId: admin.id, occurredAt: now });
recordMovement({ type: "RECEIPT", materialId: sandId, quantity: 0.2, userId: admin.id, occurredAt: now });
check("дробные количества не накапливают погрешность", getMaterial(sandId)!.quantity, 0.3);

/* --- Пароли ---------------------------------------------------------- */
const hash = hashPassword("sekret123");
check("верный пароль принимается", verifyPassword("sekret123", hash), true);
check("неверный пароль отклоняется", verifyPassword("sekret124", hash), false);
check("пароль не хранится в открытом виде", hash.includes("sekret123"), false);

/* --- Целостность ----------------------------------------------------- */
const consistency = verifyLedgerConsistency();
check("остатки сходятся с журналом движений", consistency.ok, true);

const negativeStock = queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM materials WHERE quantity < 0")!;
check("нет отрицательных остатков склада", negativeStock.c, 0);
const negativeForeman = queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM foreman_stock WHERE quantity < 0")!;
check("нет отрицательных остатков у бригадиров", negativeForeman.c, 0);

/* ================================================================== */
console.log(`\n${failed === 0 ? "✓" : "✗"} Пройдено ${passed}, провалено ${failed}`);
rmSync(TEST_DB, { force: true });
rmSync(`${TEST_DB}-wal`, { force: true });
rmSync(`${TEST_DB}-shm`, { force: true });
process.exit(failed === 0 ? 0 : 1);

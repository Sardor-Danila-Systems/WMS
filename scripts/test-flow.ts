/**
 * Сквозная проверка учёта на отдельной копии базы.
 * Проходит полный жизненный цикл материала и проверяет, что систему
 * нельзя привести в некорректное состояние.
 *
 *   npm run test:e2e
 */
const { db, getPrisma } = await import("@/lib/db/client");
const { seedDatabase } = await import("@/lib/db/seed");
const { recordMovement, verifyLedgerConsistency } = await import("@/server/movements");
const { createMaterial, createBlock, deleteMaterial, updateMaterial, updateMaterialPrice } =
  await import("@/server/catalog");
const { getMaterial, getBlockStock, listMovements } = await import("@/server/queries");
const { BusinessError } = await import("@/server/errors");
const { hashPassword, verifyPassword } = await import("@/lib/auth/password");

// Тест полностью пересоздаёт данные, поэтому запускать его следует
// на отдельной базе: укажите её в DATABASE_URL перед запуском.

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

async function checkThrows(label: string, fn: () => unknown) {
  try {
    await fn();
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
await seedDatabase({ reset: true, skipHistory: true });

const admin = (await db.user.findUniqueOrThrow({ where: { username: "admin" }, select: { id: true } }))!;

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

const { id: cementId } = await createMaterial({
  name: "Цемент М500 (тест)",
  category: "Цемент и смеси",
  unit: "мешок",
  price: 50_000,
  minStock: 50,
  initialQuantity: 100,
  userId: admin.id,
  initialStockComment: "Начальный остаток",
});
check("начальный остаток", (await getMaterial(cementId))!.quantity, 100);
check("начальная цена", (await getMaterial(cementId))!.price, 50_000);

const { id: blockId } = await createBlock({
  name: "Тестовый блок",
  description: "1-этаж",
  organizationId: "",
  sortOrder: 0,
  isActive: true,
});

await recordMovement({
  type: "RECEIPT",
  materialId: cementId,
  quantity: 500,
  unitPrice: 60_000,
  userId: admin.id,
  occurredAt: at(10),
  invoiceNumber: "16184",
  paymentMethod: "TRANSFER",
});
check("после прихода +500", (await getMaterial(cementId))!.quantity, 600);
check("приход обновил цену материала", (await getMaterial(cementId))!.price, 60_000);

const receipt = (await listMovements({ materialId: cementId }))[0];
check("сумма прихода = кол-во × цена", receipt.amount, 500 * 60_000);
check("номер фактуры сохранён", receipt.invoiceNumber, "16184");
check("способ оплаты сохранён", receipt.paymentMethod, "TRANSFER");

await recordMovement({
  type: "ISSUE",
  materialId: cementId,
  quantity: 200,
  userId: admin.id,
  blockId,
  occurredAt: at(20),
});
check("склад после расхода 200", (await getMaterial(cementId))!.quantity, 400);
check("числится за блоком", (await getBlockStock(blockId))[0]?.quantity, 200);
check(
  "расход без цены взял текущую цену материала",
  (await listMovements({ materialId: cementId }))[0].amount,
  200 * 60_000
);

await recordMovement({
  type: "RETURN",
  materialId: cementId,
  quantity: 50,
  userId: admin.id,
  blockId,
  occurredAt: at(40),
});
check("склад после возврата 50", (await getMaterial(cementId))!.quantity, 450);
check("за блоком после возврата", (await getBlockStock(blockId))[0]?.quantity, 150);
check(
  "возврат оценён по цене выдачи, а не по сегодняшней",
  (await listMovements({ materialId: cementId }))[0].amount,
  50 * 60_000
);

const history = await listMovements({ materialId: cementId });
check("записей в истории", history.length, 4);
check(
  "типы операций в истории",
  history.map((m) => m.type).reverse().join(","),
  "RECEIPT,RECEIPT,ISSUE,RETURN"
);
check("остаток склада в последней записи", history[0].warehouseAfter, 450);

/* --- Цена меняется, история сумм — нет ------------------------------- */
const amountsBefore = history.map((m) => m.amount).join(",");
await updateMaterialPrice(cementId, 75_000);
check("цена материала изменена", (await getMaterial(cementId))!.price, 75_000);
check(
  "суммы проведённых операций не переписаны",
  (await listMovements({ materialId: cementId })).map((m) => m.amount).join(","),
  amountsBefore
);

/* ================================================================== */
console.log("\nNEGATIVE TESTS — систему нельзя привести в некорректное состояние");
/* ================================================================== */

await checkThrows("нельзя выдать больше остатка склада", async () =>
  await recordMovement({ type: "ISSUE", materialId: cementId, quantity: 10_000, userId: admin.id, blockId, occurredAt: now })
);

await checkThrows("нельзя вернуть больше, чем числится за блоком", async () =>
  await recordMovement({ type: "RETURN", materialId: cementId, quantity: 500, userId: admin.id, blockId, occurredAt: now })
);

await checkThrows("нельзя создать операцию с количеством 0", async () =>
  await recordMovement({ type: "RECEIPT", materialId: cementId, quantity: 0, userId: admin.id, occurredAt: now })
);

await checkThrows("нельзя создать операцию с количеством -10", async () =>
  await recordMovement({ type: "RECEIPT", materialId: cementId, quantity: -10, userId: admin.id, occurredAt: now })
);

await checkThrows("нельзя создать операцию с NaN", async () =>
  await recordMovement({ type: "RECEIPT", materialId: cementId, quantity: Number.NaN, userId: admin.id, occurredAt: now })
);

await checkThrows("нельзя провести операцию с отрицательной ценой", async () =>
  await recordMovement({ type: "RECEIPT", materialId: cementId, quantity: 5, unitPrice: -100, userId: admin.id, occurredAt: now })
);

await checkThrows("нельзя провести операцию по несуществующему материалу", async () =>
  await recordMovement({ type: "RECEIPT", materialId: "нет-такого", quantity: 5, userId: admin.id, occurredAt: now })
);

await checkThrows("расход без блока запрещён", async () =>
  await recordMovement({ type: "ISSUE", materialId: cementId, quantity: 5, userId: admin.id, occurredAt: now })
);

await checkThrows("нельзя удалить материал с историей движений", () => deleteMaterial(cementId));

await checkThrows("нельзя изменить единицу измерения после операций", () =>
  updateMaterial(cementId, {
    name: "Цемент М500 (тест)",
    category: "Цемент и смеси",
    unit: "т",
    price: 75_000,
    minStock: 50,
  })
);

/* --- Откат транзакции ---------------------------------------------- */
const beforeFailed = (await getMaterial(cementId))!.quantity;
const movementsBefore = (await listMovements({ materialId: cementId })).length;
try {
  await recordMovement({ type: "ISSUE", materialId: cementId, quantity: 999_999, userId: admin.id, blockId, occurredAt: now });
} catch {
  // ожидаемо
}
check("остаток не изменился после отклонённой операции", (await getMaterial(cementId))!.quantity, beforeFailed);
check("движение не записалось после отклонённой операции", (await listMovements({ materialId: cementId })).length, movementsBefore);

/* --- Дробные количества --------------------------------------------- */
const { id: sandId } = await createMaterial({
  name: "Песок (тест дробных)",
  category: "Нерудные материалы",
  unit: "м³",
  price: 0,
  minStock: 5,
  initialQuantity: 0,
  userId: admin.id,
  initialStockComment: "Начальный остаток",
});
await recordMovement({ type: "RECEIPT", materialId: sandId, quantity: 0.1, userId: admin.id, occurredAt: now });
await recordMovement({ type: "RECEIPT", materialId: sandId, quantity: 0.2, userId: admin.id, occurredAt: now });
check("дробные количества не накапливают погрешность", (await getMaterial(sandId))!.quantity, 0.3);

await recordMovement({ type: "RECEIPT", materialId: sandId, quantity: 3.3, unitPrice: 180_500, userId: admin.id, occurredAt: now });
check(
  "сумма округляется до копеек, а не до float-хвоста",
  (await listMovements({ materialId: sandId }))[0].amount,
  595_650
);

/* --- Пароли ---------------------------------------------------------- */
const hash = hashPassword("sekret123");
check("верный пароль принимается", verifyPassword("sekret123", hash), true);
check("неверный пароль отклоняется", verifyPassword("sekret124", hash), false);
check("пароль не хранится в открытом виде", hash.includes("sekret123"), false);

/* --- Целостность ----------------------------------------------------- */
const consistency = await verifyLedgerConsistency();
check("остатки сходятся с журналом движений", consistency.ok, true);

const negativeStock = { c: await db.material.count({ where: { quantity: { lt: 0 } } }) };
check("нет отрицательных остатков склада", negativeStock.c, 0);
const negativeBlock = { c: await db.blockStock.count({ where: { quantity: { lt: 0 } } }) };
check("нет отрицательных остатков по блокам", negativeBlock.c, 0);

/* ================================================================== */
console.log(`\n${failed === 0 ? "✓" : "✗"} Пройдено ${passed}, провалено ${failed}`);
await getPrisma().$disconnect();
process.exit(failed === 0 ? 0 : 1);

export {};

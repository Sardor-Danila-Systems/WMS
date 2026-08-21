/**
 * Проверка на одновременную работу нескольких пользователей.
 *
 * Восемь параллельных процессов пытаются выдать по 30 единиц материала,
 * которого на складе всего 100. Корректная система должна провести ровно
 * три выдачи и отклонить остальные — без отрицательного остатка
 * и без «двойной выдачи» одного и того же материала.
 */
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

const TEST_DB = path.join(process.cwd(), "data", "test-concurrency.db");

if (process.env.WMS_WORKER === "1") {
  // --- Дочерний процесс: одна попытка выдачи ---
  process.env.WMS_DB_PATH = TEST_DB;
  const { recordMovement } = await import("@/server/movements");
  const { queryOne } = await import("@/lib/db/client");

  const material = queryOne<{ id: string }>("SELECT id FROM materials LIMIT 1")!;
  const foreman = queryOne<{ id: string }>("SELECT id FROM foremen LIMIT 1")!;
  const user = queryOne<{ id: string }>("SELECT id FROM users LIMIT 1")!;

  try {
    recordMovement({
      type: "ISSUE",
      materialId: material.id,
      quantity: 30,
      userId: user.id,
      foremanId: foreman.id,
      occurredAt: new Date().toISOString(),
    });
    console.log("OK");
  } catch {
    console.log("REJECTED");
  }
  process.exit(0);
}

// --- Родительский процесс ---
for (const suffix of ["", "-wal", "-shm"]) rmSync(`${TEST_DB}${suffix}`, { force: true });
process.env.WMS_DB_PATH = TEST_DB;

const { getDb, queryOne } = await import("@/lib/db/client");
const { seedDatabase } = await import("@/lib/db/seed");
const { createMaterial, createForeman } = await import("@/server/catalog");
const { verifyLedgerConsistency } = await import("@/server/movements");
const { getMaterial } = await import("@/server/queries");

getDb();
seedDatabase({ reset: true, skipHistory: true });

const admin = queryOne<{ id: string }>("SELECT id FROM users WHERE username = 'admin'")!;

// Оставляем в базе ровно один материал и одного бригадира, чтобы
// дочерние процессы гарантированно работали с одной и той же позицией.
getDb().exec("DELETE FROM materials");
getDb().exec("DELETE FROM foremen");

const { id: materialId } = createMaterial({
  name: "Дефицитный материал",
  category: "Прочее",
  unit: "шт",
  minStock: 0,
  initialQuantity: 100,
  userId: admin.id,
});
createForeman({ name: "Бригадир", phone: "", brigade: "", projectId: "", isActive: true });

console.log("На складе до начала: 100 шт, 8 процессов пытаются выдать по 30 шт\n");

const workers = Array.from({ length: 8 }, () =>
  spawnSync(process.execPath, ["--no-warnings", "--import", "./scripts/register-alias.mjs", "scripts/test-concurrency.ts"], {
    env: { ...process.env, WMS_WORKER: "1" },
    encoding: "utf8",
  })
);

const results = workers.map((w) => w.stdout.trim().split("\n").pop());
const succeeded = results.filter((r) => r === "OK").length;
const rejected = results.filter((r) => r === "REJECTED").length;

const remaining = getMaterial(materialId)!.quantity;
const issuedCount = queryOne<{ c: number }>(
  "SELECT COUNT(*) AS c FROM stock_movements WHERE type = 'ISSUE'"
)!.c;
const consistency = verifyLedgerConsistency();

let failed = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    console.log(`  ✓ ${label}: ${actual}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}: получено ${actual}, ожидалось ${expected}`);
  }
}

check("успешных выдач", succeeded, 3);
check("отклонённых попыток", rejected, 5);
check("записей о выдаче в журнале", issuedCount, 3);
check("остаток на складе", remaining, 10);
check("остаток не отрицательный", remaining >= 0, true);
check("журнал сходится с остатками", consistency.ok, true);

for (const suffix of ["", "-wal", "-shm"]) rmSync(`${TEST_DB}${suffix}`, { force: true });
console.log(`\n${failed === 0 ? "✓ Одновременная работа безопасна" : "✗ Обнаружена гонка"}`);
process.exit(failed === 0 ? 0 : 1);

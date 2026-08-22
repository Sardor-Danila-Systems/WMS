/**
 * Проверка на одновременную работу нескольких пользователей.
 *
 * Восемь параллельных транзакций пытаются выдать по 30 единиц материала,
 * которого на складе всего 100. Корректная система должна провести ровно
 * три выдачи и отклонить остальные — без отрицательного остатка
 * и без «двойной выдачи» одного и того же материала.
 *
 * Здесь проверяется именно блокировка строки (SELECT ... FOR UPDATE):
 * без неё все восемь транзакций прочитали бы остаток 100 одновременно
 * и списали бы 240 единиц из имеющихся 100.
 */
import { db, getPrisma } from "@/lib/db/client";
import { seedDatabase } from "@/lib/db/seed";
import { recordMovement, verifyLedgerConsistency } from "@/server/movements";
import { createForeman, createMaterial } from "@/server/catalog";
import { getMaterial } from "@/server/queries";
import { BusinessError } from "@/server/errors";

await seedDatabase({ reset: true, skipHistory: true });

const admin = await db.user.findUniqueOrThrow({ where: { username: "admin" }, select: { id: true } });

// Оставляем ровно один материал и одного бригадира, чтобы все транзакции
// боролись за одну и ту же строку.
await db.material.deleteMany();
await db.foreman.deleteMany();

const { id: materialId } = await createMaterial({
  name: "Дефицитный материал",
  category: "Прочее",
  unit: "шт",
  minStock: 0,
  initialQuantity: 100,
  userId: admin.id,
  initialStockComment: "Начальный остаток",
});
const { id: foremanId } = await createForeman({
  name: "Бригадир",
  phone: "",
  brigade: "",
  projectId: "",
  isActive: true,
});

console.log("На складе до начала: 100 шт, 8 параллельных выдач по 30 шт\n");

const attempts = await Promise.all(
  Array.from({ length: 8 }, async () => {
    try {
      await recordMovement({
        type: "ISSUE",
        materialId,
        quantity: 30,
        userId: admin.id,
        foremanId,
        occurredAt: new Date().toISOString(),
      });
      return "OK";
    } catch (error) {
      if (error instanceof BusinessError) return "REJECTED";
      throw error;
    }
  })
);

const succeeded = attempts.filter((r) => r === "OK").length;
const rejected = attempts.filter((r) => r === "REJECTED").length;

const remaining = (await getMaterial(materialId))!.quantity;
const issued = await db.stockMovement.count({ where: { type: "ISSUE" } });
const consistency = await verifyLedgerConsistency();

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
check("записей о выдаче в журнале", issued, 3);
check("остаток на складе", remaining, 10);
check("остаток не отрицательный", remaining >= 0, true);
check("журнал сходится с остатками", consistency.ok, true);

console.log(`\n${failed === 0 ? "✓ Одновременная работа безопасна" : "✗ Обнаружена гонка"}`);
await getPrisma().$disconnect();
process.exit(failed === 0 ? 0 : 1);

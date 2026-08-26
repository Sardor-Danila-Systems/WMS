/** Проверка целостности базы: сходятся ли остатки с журналом движений. */
import { db, getPrisma } from "@/lib/db/client";
import { verifyLedgerConsistency } from "@/server/movements";
import { describeDatabase } from "@/lib/db/seed";

console.log("Содержимое базы:");
console.table(await describeDatabase());

console.log("\nДвижения по типам:");
console.table(
  await db.$queryRaw<{ type: string; count: number; total: number }[]>`
    SELECT type, COUNT(*)::int AS count, ROUND(SUM(quantity)::numeric, 1)::float8 AS total
      FROM stock_movements GROUP BY type ORDER BY type
  `
);

console.log("\nМатериалы, числящиеся за блоками (топ-8):");
console.table(
  await db.$queryRaw<Record<string, unknown>[]>`
    SELECT b.name AS block, m.name AS material, bs.quantity, m.unit
      FROM block_stock bs
      JOIN blocks b ON b.id = bs.block_id
      JOIN materials m ON m.id = bs.material_id
     WHERE bs.quantity > 0
     ORDER BY bs.quantity DESC LIMIT 8
  `
);

const negativeStock = await db.material.count({ where: { quantity: { lt: 0 } } });
const negativeBlock = await db.blockStock.count({ where: { quantity: { lt: 0 } } });
const negativeAmount = await db.stockMovement.count({ where: { amount: { lt: 0 } } });
const badQty = await db.stockMovement.count({ where: { quantity: { lte: 0 } } });
const consistency = await verifyLedgerConsistency();

console.log("\nПроверки целостности:");
console.table([
  { Проверка: "Отрицательный остаток склада", Нарушений: negativeStock },
  { Проверка: "Отрицательный остаток блока", Нарушений: negativeBlock },
  { Проверка: "Движения с количеством <= 0", Нарушений: badQty },
  { Проверка: "Движения с отрицательной суммой", Нарушений: negativeAmount },
  { Проверка: "Расхождение остатка материала с журналом", Нарушений: consistency.materialMismatches.length },
  { Проверка: "Расхождение остатка блока с журналом", Нарушений: consistency.blockMismatches.length },
]);

const ok =
  negativeStock === 0 &&
  negativeBlock === 0 &&
  badQty === 0 &&
  negativeAmount === 0 &&
  consistency.ok;
console.log(ok ? "\n✓ База целостна." : "\n✗ Найдены нарушения целостности.");

await getPrisma().$disconnect();
process.exit(ok ? 0 : 1);

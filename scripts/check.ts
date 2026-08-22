/** Проверка целостности базы: сходятся ли остатки с журналом движений. */
import { getPool, queryAll, queryOne } from "@/lib/db/client";
import { verifyLedgerConsistency } from "@/server/movements";
import { describeDatabase } from "@/lib/db/seed";

console.log("Содержимое базы:");
console.table(await describeDatabase());

console.log("\nДвижения по типам:");
console.table(
  await queryAll<{ type: string; count: number; total: number }>(
    "SELECT type, COUNT(*)::int AS count, ROUND(SUM(quantity)::numeric, 1)::float8 AS total FROM stock_movements GROUP BY type ORDER BY type"
  )
);

console.log("\nМатериалы на руках у бригадиров (топ-8):");
console.table(
  await queryAll<Record<string, unknown>>(
    `SELECT f.name AS foreman, m.name AS material, fs.quantity, m.unit
       FROM foreman_stock fs
       JOIN foremen f ON f.id = fs.foreman_id
       JOIN materials m ON m.id = fs.material_id
      WHERE fs.quantity > 0
      ORDER BY fs.quantity DESC LIMIT 8`
  )
);

const negativeStock = await queryOne<{ c: number }>("SELECT COUNT(*)::int AS c FROM materials WHERE quantity < 0");
const negativeForeman = await queryOne<{ c: number }>("SELECT COUNT(*)::int AS c FROM foreman_stock WHERE quantity < 0");
const badQty = await queryOne<{ c: number }>("SELECT COUNT(*)::int AS c FROM stock_movements WHERE quantity <= 0");

const consistency = await verifyLedgerConsistency();

console.log("\nПроверки целостности:");
console.table([
  { Проверка: "Отрицательный остаток склада", Нарушений: negativeStock?.c ?? 0 },
  { Проверка: "Отрицательный остаток бригадира", Нарушений: negativeForeman?.c ?? 0 },
  { Проверка: "Движения с количеством <= 0", Нарушений: badQty?.c ?? 0 },
  { Проверка: "Расхождение остатка материала с журналом", Нарушений: consistency.materialMismatches.length },
  { Проверка: "Расхождение остатка бригадира с журналом", Нарушений: consistency.foremanMismatches.length },
]);

const ok =
  (negativeStock?.c ?? 0) === 0 &&
  (negativeForeman?.c ?? 0) === 0 &&
  (badQty?.c ?? 0) === 0 &&
  consistency.ok;

console.log(ok ? "\n✓ База целостна." : "\n✗ Найдены нарушения целостности.");
await getPool().end();
process.exit(ok ? 0 : 1);

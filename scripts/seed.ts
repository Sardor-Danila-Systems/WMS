/**
 * Наполняет базу демонстрационными данными.
 *   npm run db:seed          — заполнить, если база пустая
 *   npm run db:seed -- --reset — стереть всё и заполнить заново
 */
import { seedDatabase, isDatabaseSeeded, describeDatabase } from "@/lib/db/seed";
import { verifyLedgerConsistency } from "@/server/movements";
import { USERS_SEED } from "@/lib/db/seed-people";

const reset = process.argv.includes("--reset");

if (!reset && isDatabaseSeeded()) {
  console.log("База уже заполнена. Используйте --reset, чтобы пересоздать данные.");
  console.table(describeDatabase());
  process.exit(0);
}

console.log(reset ? "Пересоздаю данные..." : "Заполняю базу...");
const result = seedDatabase({ reset });

console.log("\nГотово:");
console.table(result);

const consistency = verifyLedgerConsistency();
console.log(
  consistency.ok
    ? "\n✓ Остатки сходятся с журналом движений."
    : `\n✗ Расхождения: ${consistency.materialMismatches.length} по материалам, ${consistency.foremanMismatches.length} по бригадирам`
);
if (!consistency.ok) {
  console.log(consistency.materialMismatches.slice(0, 5));
  process.exit(1);
}

console.log("\nУчётные записи для входа:");
for (const user of USERS_SEED) {
  console.log(`  ${user.username.padEnd(10)} / ${user.password.padEnd(10)} — ${user.fullName} (${user.role})`);
}

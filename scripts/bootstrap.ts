/**
 * Начальная настройка рабочей базы: организация и блоки стройки.
 *
 * В отличие от `db:seed` ничего не удаляет и не заводит демонстрационных
 * материалов — только то, без чего систему нельзя начать вести: организацию,
 * на которую оформляются приход и расход, и блоки A–E, куда уходит материал.
 *
 * Запускать повторно безопасно: уже заведённые записи пропускаются.
 *
 *   npm run db:bootstrap                 — организация «Gagarin Avenue»
 *   npm run db:bootstrap -- "Название"   — другая организация
 */
import { db, getPrisma } from "@/lib/db/client";
import { BLOCKS_SEED, ORGANIZATIONS_SEED } from "@/lib/db/seed-people";

const [nameArg] = process.argv.slice(2);
const template = ORGANIZATIONS_SEED[0];
const name = nameArg?.trim() || template.name;

const target = (process.env.DATABASE_URL ?? "").replace(/:[^:@/]*@/, ":****@");
console.log(`База: ${target}\n`);

const organization =
  (await db.organization.findFirst({ where: { name: { equals: name, mode: "insensitive" } } })) ??
  (await db.organization.create({
    data: {
      name,
      // Адрес и реквизиты берутся из шаблона только для организации по умолчанию:
      // у названной вручную их знает лишь заказчик — заполнит в интерфейсе.
      address: name === template.name ? template.address : "",
      inn: name === template.name ? template.inn : "",
      phone: name === template.name ? template.phone : "",
    },
  }));
console.log(`Организация: ${organization.name}`);

for (const block of BLOCKS_SEED) {
  const existing = await db.block.findFirst({
    where: { name: { equals: block.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    console.log(`  = блок ${block.name} — уже есть`);
    continue;
  }
  await db.block.create({
    data: {
      name: block.name,
      description: block.description,
      sortOrder: block.sortOrder,
      organizationId: organization.id,
    },
  });
  console.log(`  + блок ${block.name}`);
}

// Валюта нужна интерфейсу для подписи сумм — ставим, только если не задана.
const currency = await db.setting.findUnique({ where: { key: "currency" } });
if (!currency) {
  await db.setting.create({ data: { key: "currency", value: "сум" } });
  console.log("\nВалюта: сум");
}

console.log("\nСостояние базы:");
console.table({
  Организации: await db.organization.count(),
  Блоки: await db.block.count(),
  Поставщики: await db.supplier.count(),
  Материалы: await db.material.count(),
  Сотрудники: await db.user.count(),
});

await getPrisma().$disconnect();

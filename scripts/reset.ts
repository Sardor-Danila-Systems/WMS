/**
 * Полная очистка базы: удаляет все данные и заводит одного администратора.
 *
 * Учётная запись создаётся обязательно — без неё в систему невозможно войти,
 * и она стала бы недоступна даже администратору.
 *
 *   npm run db:reset -- <логин> <пароль> "<ФИО>"
 */
import { db, getPrisma } from "@/lib/db/client";
import { createUser } from "@/server/catalog";

const [username = "admin", password, fullName] = process.argv.slice(2);

if (!password || password.length < 6) {
  console.error('Использование: npm run db:reset -- <логин> <пароль> "<ФИО>"');
  console.error("Пароль должен быть не короче 6 символов.");
  process.exit(1);
}

const target = (process.env.DATABASE_URL ?? "").replace(/:[^:@/]*@/, ":****@");
console.log(`База: ${target}\n`);

const before = {
  Движения: await db.stockMovement.count(),
  Материалы: await db.material.count(),
  Блоки: await db.block.count(),
  Организации: await db.organization.count(),
  Поставщики: await db.supplier.count(),
  Сотрудники: await db.user.count(),
};
console.log("Будет удалено:");
console.table(before);

// Порядок важен: сначала зависимые таблицы, потом справочники.
await db.stockMovement.deleteMany();
await db.blockStock.deleteMany();
await db.session.deleteMany();
await db.block.deleteMany();
await db.material.deleteMany();
await db.organization.deleteMany();
await db.supplier.deleteMany();
await db.user.deleteMany();
await db.setting.deleteMany();

console.log("✓ Все данные удалены.\n");

await createUser({
  username,
  fullName: fullName || username,
  position: "Администратор",
  phone: "",
  role: "ADMIN",
  password,
});

console.log(`✓ Создан администратор «${username}».`);
console.log("  Смените пароль в разделе «Сотрудники» после первого входа.\n");

const after = {
  Движения: await db.stockMovement.count(),
  Материалы: await db.material.count(),
  Блоки: await db.block.count(),
  Организации: await db.organization.count(),
  Поставщики: await db.supplier.count(),
  Сотрудники: await db.user.count(),
};
console.log("Состояние базы:");
console.table(after);

await getPrisma().$disconnect();

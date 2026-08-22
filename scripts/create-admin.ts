/**
 * Создаёт администратора в пустой базе (или меняет пароль существующему).
 *   npm run db:create-admin -- <логин> <пароль> "<ФИО>"
 */
import { getPool, queryOne } from "@/lib/db/client";
import { createUser, updateUser } from "@/server/catalog";

const [username, password, fullName] = process.argv.slice(2);

if (!username || !password) {
  console.error('Использование: npm run db:create-admin -- <логин> <пароль> "<ФИО>"');
  process.exit(1);
}
if (password.length < 6) {
  console.error("Пароль должен быть не короче 6 символов.");
  process.exit(1);
}

const existing = await queryOne<{ id: string }>(
  "SELECT id FROM users WHERE lower(username) = lower(?)",
  username
);

if (existing) {
  await updateUser(existing.id, {
    fullName: fullName || username,
    position: "Администратор",
    phone: "",
    role: "ADMIN",
    isActive: true,
    password,
  });
  console.log(`✓ Пароль администратора «${username}» обновлён.`);
} else {
  await createUser({
    username,
    fullName: fullName || username,
    position: "Администратор",
    phone: "",
    role: "ADMIN",
    password,
  });
  console.log(`✓ Администратор «${username}» создан.`);
}

console.log("Теперь можно войти в систему этим логином.");
await getPool().end();

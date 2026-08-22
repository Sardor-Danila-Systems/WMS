/**
 * Создаёт схему базы данных. Выполняется повторно без вреда для данных.
 *   npm run db:migrate
 */
import { getPool } from "@/lib/db/client";
import { SCHEMA_SQL } from "@/lib/db/schema";

const pool = getPool();
const target = (process.env.DATABASE_URL ?? "").replace(/:[^:@/]*@/, ":****@");
console.log(`Применяю схему к базе: ${target || "(DATABASE_URL не задан)"}`);

await pool.query(SCHEMA_SQL);

const tables = await pool.query<{ name: string }>(
  "SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
);
console.log("✓ Схема применена. Таблицы:", tables.rows.map((r) => r.name).join(", "));
await pool.end();

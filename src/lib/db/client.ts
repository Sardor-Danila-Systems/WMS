import "@/lib/server-only";

import { Pool, type PoolClient } from "pg";

/**
 * Подключение к PostgreSQL.
 *
 * В dev-режиме Next.js перезагружает модули при каждом изменении файла,
 * поэтому пул храним в globalThis — иначе на каждой пересборке создавался бы
 *новый набор соединений и база быстро упёрлась бы в лимит.
 */
const globalForDb = globalThis as unknown as { __wmsPool?: Pool };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Не задана переменная окружения DATABASE_URL. " +
        "Укажите строку подключения к PostgreSQL (например, из Neon) в настройках проекта."
    );
  }

  return new Pool({
    connectionString,
    // Neon и другие облачные базы требуют TLS. Локальный Postgres обычно без него.
    ssl: /\bsslmode=require\b/.test(connectionString) || /neon\.tech/.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
    // На serverless-платформе каждый экземпляр держит мало соединений:
    // их общее число ограничено на стороне базы.
    max: Number(process.env.WMS_DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool(): Pool {
  if (!globalForDb.__wmsPool) {
    globalForDb.__wmsPool = createPool();
    // Без обработчика разрыв соединения с базой уронил бы весь процесс.
    globalForDb.__wmsPool.on("error", (error) => {
      console.error("[wms] Ошибка соединения с базой данных:", error.message);
    });
  }
  return globalForDb.__wmsPool;
}

/** Значения, которые можно передать параметром запроса. */
export type SqlParam = string | number | boolean | null | Date;

/**
 * Запросы написаны с плейсхолдерами `?`, а PostgreSQL ожидает `$1, $2, ...`.
 * Преобразование собрано в одном месте, чтобы нумерацию не приходилось
 * поддерживать вручную в каждом запросе — это самый частый источник ошибок
 * при переносе SQL. В запросах нет строковых литералов со знаком «?»,
 * поэтому простой замены достаточно.
 */
function toPositionalParams(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

/** Единый интерфейс доступа к данным: и для пула, и внутри транзакции. */
export interface Db {
  all<T>(sql: string, ...params: SqlParam[]): Promise<T[]>;
  one<T>(sql: string, ...params: SqlParam[]): Promise<T | undefined>;
  run(sql: string, ...params: SqlParam[]): Promise<{ changes: number }>;
}

function makeDb(executor: Pool | PoolClient): Db {
  return {
    async all<T>(sql: string, ...params: SqlParam[]): Promise<T[]> {
      const result = await executor.query(toPositionalParams(sql), params);
      return result.rows as T[];
    },
    async one<T>(sql: string, ...params: SqlParam[]): Promise<T | undefined> {
      const result = await executor.query(toPositionalParams(sql), params);
      return result.rows[0] as T | undefined;
    },
    async run(sql: string, ...params: SqlParam[]): Promise<{ changes: number }> {
      const result = await executor.query(toPositionalParams(sql), params);
      return { changes: result.rowCount ?? 0 };
    },
  };
}

/** Доступ к данным вне транзакции — каждый запрос берёт свободное соединение из пула. */
export const db: Db = {
  all: (sql, ...params) => makeDb(getPool()).all(sql, ...params),
  one: (sql, ...params) => makeDb(getPool()).one(sql, ...params),
  run: (sql, ...params) => makeDb(getPool()).run(sql, ...params),
};

export function queryAll<T>(sql: string, ...params: SqlParam[]): Promise<T[]> {
  return db.all<T>(sql, ...params);
}

export function queryOne<T>(sql: string, ...params: SqlParam[]): Promise<T | undefined> {
  return db.one<T>(sql, ...params);
}

export function execute(sql: string, ...params: SqlParam[]): Promise<{ changes: number }> {
  return db.run(sql, ...params);
}

/**
 * Выполняет callback в транзакции на одном соединении.
 * Любая ошибка внутри откатывает всё целиком, поэтому остаток склада
 * и запись движения не могут разъехаться.
 */
export async function transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(makeDb(client));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Соединение уже могло откатить транзакцию само — исходную ошибку это не отменяет.
    }
    throw error;
  } finally {
    client.release();
  }
}

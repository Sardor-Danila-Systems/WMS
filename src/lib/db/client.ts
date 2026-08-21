import "@/lib/server-only";

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { SCHEMA_SQL } from "./schema";

/**
 * Единственное подключение к базе на процесс.
 * В dev-режиме Next.js перезагружает модули при каждом изменении файла,
 * поэтому храним соединение в globalThis, иначе получим утечку дескрипторов.
 */
const globalForDb = globalThis as unknown as { __wmsDb?: DatabaseSync };

const DEFAULT_DB_DIR = "data";
const DEFAULT_DB_FILE = "wms.db";

/**
 * Путь к файлу базы. По умолчанию — `data/wms.db` в корне проекта;
 * переопределяется переменной окружения `WMS_DB_PATH` (нужно, например,
 * чтобы тесты работали на отдельной копии базы).
 *
 * Путь строится статически внутри известного каталога, иначе трассировщик
 * файлов Turbopack не может определить границы и тянет в сборку весь проект.
 */
function resolveDbPath(): string {
  const configured = process.env.WMS_DB_PATH;
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(configured);
  }
  return path.join(process.cwd(), DEFAULT_DB_DIR, DEFAULT_DB_FILE);
}

function openDatabase(): DatabaseSync {
  const dbPath = resolveDbPath();
  mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);

  // WAL даёт конкурентное чтение во время записи — два пользователя не блокируют друг друга.
  db.exec("PRAGMA journal_mode = WAL");
  // Без этого SQLite молча игнорирует внешние ключи и мы потеряем ссылочную целостность.
  db.exec("PRAGMA foreign_keys = ON");
  // Ждём освобождения блокировки вместо мгновенной ошибки SQLITE_BUSY.
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA synchronous = NORMAL");

  db.exec(SCHEMA_SQL);

  return db;
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__wmsDb) {
    globalForDb.__wmsDb = openDatabase();
  }
  return globalForDb.__wmsDb;
}

/**
 * Выполняет callback в транзакции. Любая ошибка внутри откатывает всё целиком,
 * поэтому остаток склада и запись движения не могут разъехаться.
 */
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Соединение уже могло откатить транзакцию само — исходную ошибку это не отменяет.
    }
    throw error;
  }
}

/** Значения, которые SQLite принимает как параметры запроса. */
export type SqlParam = string | number | bigint | null | Uint8Array;

/**
 * Типизированные обёртки над `prepare`.
 *
 * `node:sqlite` отдаёт строки объектами без прототипа (`Object.create(null)`).
 * React не умеет передавать такие объекты из серверных компонентов в клиентские,
 * поэтому здесь каждая строка копируется в обычный объект. Это единственное
 * место, где данные попадают из базы в приложение, — так проблема закрыта
 * сразу для всех запросов, а не в каждом вызове по отдельности.
 */
export function queryAll<T>(sql: string, ...params: SqlParam[]): T[] {
  const rows = getDb().prepare(sql).all(...params);
  return rows.map((row) => ({ ...row })) as unknown as T[];
}

export function queryOne<T>(sql: string, ...params: SqlParam[]): T | undefined {
  const row = getDb().prepare(sql).get(...params);
  return row === undefined ? undefined : ({ ...row } as unknown as T);
}

export function execute(sql: string, ...params: SqlParam[]): { changes: number } {
  const result = getDb().prepare(sql).run(...params);
  return { changes: Number(result.changes) };
}

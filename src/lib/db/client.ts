import "@/lib/server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Подключение к PostgreSQL через Prisma.
 *
 * Prisma 7 работает только через драйвер-адаптер — здесь это `pg`,
 * который одинаково подходит и локальному Postgres, и пулеру Neon.
 *
 * В dev-режиме Next.js перезагружает модули при каждом изменении файла,
 * поэтому клиент хранится в globalThis — иначе на каждой пересборке
 * создавался бы новый пул соединений и база быстро упёрлась бы в лимит.
 */
const globalForPrisma = globalThis as unknown as { __wmsPrisma?: PrismaClient };

function resolveUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Не задана переменная окружения DATABASE_URL. " +
        "Укажите строку подключения к PostgreSQL (например, из Neon) в настройках проекта."
    );
  }
  return url;
}

function createClient(): PrismaClient {
  const url = resolveUrl();

  const adapter = new PrismaPg({
    connectionString: url,
    // Облачные базы требуют TLS; локальный Postgres обычно без него.
    ssl: /neon\.tech|sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
    // На serverless-платформе каждый экземпляр держит мало соединений:
    // их общее число ограничено на стороне базы.
    max: Number(process.env.WMS_DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Значения по умолчанию (2с ожидания, 5с на транзакцию) рассчитаны на
    // локальную базу. До облачной каждый запрос идёт по сети, поэтому
    // складской операции из нескольких запросов такого запаса не хватает.
    transactionOptions: { maxWait: 10_000, timeout: 20_000 },
  });
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.__wmsPrisma) {
    globalForPrisma.__wmsPrisma = createClient();
  }
  return globalForPrisma.__wmsPrisma;
}

/** Короткий доступ к клиенту: `db.material.findMany(...)`. */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getPrisma(), prop);
  },
});

/** Клиент внутри транзакции — тот же API, кроме управления транзакциями. */
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Выполняет callback в транзакции. Любая ошибка внутри откатывает всё целиком,
 * поэтому остаток склада и запись движения не могут разъехаться.
 */
export function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getPrisma().$transaction(fn);
}

import "@/lib/server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/**
 * scrypt из стандартной библиотеки Node — намеренно медленная функция,
 * поэтому подбор пароля по украденной базе непрактичен.
 * Формат хранения: `scrypt$<соль в hex>$<ключ в hex>`.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const actual = scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH);
  // Сравнение за постоянное время, чтобы не подсказывать злоумышленнику
  // длину совпадающего префикса по времени ответа.
  return timingSafeEqual(actual, expected);
}

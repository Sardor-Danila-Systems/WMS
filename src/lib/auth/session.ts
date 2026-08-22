import "@/lib/server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { execute, queryOne } from "@/lib/db/client";
import { SESSION_COOKIE } from "./constants";
import type { Role, User } from "@/types";

export { SESSION_COOKIE };

const SESSION_DAYS = 7;

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  position: string;
  role: Role;
}

interface UserRow {
  id: string;
  username: string;
  full_name: string;
  position: string;
  phone: string;
  role: Role;
  is_active: number;
  created_at: string;
}

export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    position: row.position,
    phone: row.phone,
    role: row.role,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

/** Создаёт сессию в базе и кладёт её идентификатор в httpOnly-cookie. */
export async function createSession(userId: string): Promise<void> {
  // 256 бит случайности: угадать идентификатор перебором невозможно,
  // поэтому подписывать cookie дополнительно не требуется.
  const sessionId = randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000);

  await execute(
    "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    sessionId,
    userId,
    now.toISOString(),
    expires.toISOString()
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await execute("DELETE FROM sessions WHERE id = ?", sessionId);
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Возвращает текущего пользователя или null. Просроченные сессии удаляются на лету. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const row = await queryOne<{
    expires_at: string;
    id: string;
    username: string;
    full_name: string;
    position: string;
    role: Role;
    is_active: number;
  }>(
    `SELECT s.expires_at, u.id, u.username, u.full_name, u.position, u.role, u.is_active
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = ?`,
    sessionId
  );

  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now() || row.is_active !== 1) {
    await execute("DELETE FROM sessions WHERE id = ?", sessionId);
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    position: row.position,
    role: row.role,
  };
}

import "@/lib/server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { db } from "@/lib/db/client";
import { SESSION_COOKIE } from "./constants";
import type { Role } from "@/types";

export { SESSION_COOKIE };

const SESSION_DAYS = 7;

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  position: string;
  role: Role;
}

/** Создаёт сессию в базе и кладёт её идентификатор в httpOnly-cookie. */
export async function createSession(userId: string): Promise<void> {
  // 256 бит случайности: угадать идентификатор перебором невозможно,
  // поэтому подписывать cookie дополнительно не требуется.
  const sessionId = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await db.session.create({ data: { id: sessionId, userId, expiresAt: expires } });

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
    await db.session.deleteMany({ where: { id: sessionId } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Возвращает текущего пользователя или null. Просроченные сессии удаляются на лету. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const row = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          position: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!row) return null;

  if (row.expiresAt.getTime() < Date.now() || !row.user.isActive) {
    await db.session.deleteMany({ where: { id: sessionId } });
    return null;
  }

  return {
    id: row.user.id,
    username: row.user.username,
    fullName: row.user.fullName,
    position: row.user.position,
    role: row.user.role,
  };
}

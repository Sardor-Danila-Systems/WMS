"use server";

import { redirect } from "next/navigation";

import { queryOne } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";
import { getDictionary } from "@/i18n/server";
import { translateValidation } from "@/i18n";
import type { Role } from "@/types";

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  const dict = await getDictionary();

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return { error: first ? translateValidation(dict, first) : dict.auth.invalidCredentials };
  }

  // Если учётных записей нет вообще — это не «неверный пароль», а незаполненная
  // база. Без отдельного сообщения такая ситуация выглядит как ошибка ввода,
  // и причину приходится искать в логах сервера.
  const total = await queryOne<{ c: number }>("SELECT COUNT(*) AS c FROM users");
  if ((total?.c ?? 0) === 0) {
    return { error: dict.auth.emptyDatabase };
  }

  const user = await queryOne<{ id: string; password_hash: string; is_active: number; role: Role }>(
    "SELECT id, password_hash, is_active, role FROM users WHERE LOWER(username) = LOWER(?)",
    parsed.data.username
  );

  // Одинаковый текст для неизвестного логина и неверного пароля — чтобы нельзя
  // было перебором выяснить, какие учётные записи существуют.
  const invalid = { error: dict.auth.invalidCredentials };
  if (!user) return invalid;
  if (!verifyPassword(parsed.data.password, user.password_hash)) return invalid;
  if (user.is_active !== 1) return { error: dict.auth.accountDisabled };

  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

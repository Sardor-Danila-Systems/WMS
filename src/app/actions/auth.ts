"use server";

import { redirect } from "next/navigation";

import { db } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";
import { getLooseT, getT } from "@/i18n/server";
import { translateValidation } from "@/i18n/validation";

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  const t = await getT();

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return { error: first ? translateValidation(await getLooseT(), first) : t("auth.invalidCredentials") };
  }

  // Если учётных записей нет вообще — это не «неверный пароль», а незаполненная
  // база. Без отдельного сообщения такая ситуация выглядит как ошибка ввода,
  // и причину приходится искать в логах сервера.
  const total = await db.user.count();
  if (total === 0) {
    return { error: t("auth.emptyDatabase") };
  }

  const user = await db.user.findFirst({
    where: { username: { equals: parsed.data.username, mode: "insensitive" } },
    select: { id: true, passwordHash: true, isActive: true },
  });

  // Одинаковый текст для неизвестного логина и неверного пароля — чтобы нельзя
  // было перебором выяснить, какие учётные записи существуют.
  const invalid = { error: t("auth.invalidCredentials") };
  if (!user) return invalid;
  if (!verifyPassword(parsed.data.password, user.passwordHash)) return invalid;
  if (!user.isActive) return { error: t("auth.accountDisabled") };

  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

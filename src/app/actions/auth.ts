"use server";

import { redirect } from "next/navigation";

import { queryOne } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";
import type { Role } from "@/types";

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте логин и пароль" };
  }

  const user = queryOne<{ id: string; password_hash: string; is_active: number; role: Role }>(
    "SELECT id, password_hash, is_active, role FROM users WHERE LOWER(username) = LOWER(?)",
    parsed.data.username
  );

  // Одинаковый текст для неизвестного логина и неверного пароля — чтобы нельзя
  // было перебором выяснить, какие учётные записи существуют.
  const invalid = { error: "Неверный логин или пароль" };
  if (!user) return invalid;
  if (!verifyPassword(parsed.data.password, user.password_hash)) return invalid;
  if (user.is_active !== 1) return { error: "Учётная запись отключена. Обратитесь к администратору." };

  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

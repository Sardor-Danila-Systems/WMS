"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";

import { isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/types";

/** Переключает язык интерфейса. Выбор хранится в cookie этого браузера. */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  refresh();
}

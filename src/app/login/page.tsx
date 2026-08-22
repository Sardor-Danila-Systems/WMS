import { redirect } from "next/navigation";

import { LanguageSwitch } from "@/components/layout/language-switch";
import { LoginForm } from "@/features/auth/login-form";
import { getSessionUser } from "@/lib/auth/session";
import { getT } from "@/i18n/server";

export const metadata = {
  title: "Gagarin Avenue WMS",
};

export default async function LoginPage() {
  // Решение «пользователь уже вошёл» принимается здесь, а не в proxy:
  // только тут можно проверить, существует ли сессия в базе. Просроченный
  // cookie просто покажет форму входа вместо цикла переадресаций.
  if (await getSessionUser()) redirect("/");

  const t = await getT();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-[14.5px] font-bold tracking-tight text-primary-foreground">
            GA
          </div>
          <h1 className="text-[19px] font-semibold tracking-tight">{t("app.name")}</h1>
          <p className="mt-1.5 text-[14.5px] text-muted-foreground">{t("app.tagline")}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <LoginForm />
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <LanguageSwitch />
          <p className="text-center text-[13px] text-muted-foreground">{t("auth.accessNote")}</p>
        </div>
      </div>
    </div>
  );
}

import { Boxes } from "lucide-react";

import { LoginForm } from "@/features/auth/login-form";

export const metadata = {
  title: "Вход — СтройСклад",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Boxes className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">СтройСклад</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Учёт движения строительных материалов
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Доступ выдаёт администратор склада
        </p>
      </div>
    </div>
  );
}

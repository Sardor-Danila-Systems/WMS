"use client";

import { useActionState } from "react";
import { AlertCircle, LogIn } from "lucide-react";

import { login, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/shared/components/form-field";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState | undefined, FormData>(
    login,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormField label="Логин" htmlFor="username" required>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          required
          placeholder="Например, admin"
          disabled={pending}
        />
      </FormField>

      <FormField label="Пароль" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          disabled={pending}
        />
      </FormField>

      {state?.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <Button type="submit" className="w-full gap-2" disabled={pending}>
        <LogIn className="h-4 w-4" />
        {pending ? "Проверяем..." : "Войти"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { AlertCircle, LogIn } from "lucide-react";

import { login, type LoginState } from "@/app/actions/auth";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/shared/components/form-field";

export function LoginForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState<LoginState | undefined, FormData>(
    login,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormField label={t("auth.username")} htmlFor="username" required>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          required
          placeholder={t("auth.usernamePlaceholder")}
          disabled={pending}
        />
      </FormField>

      <FormField label={t("auth.password")} htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder={t("auth.passwordPlaceholder")}
          disabled={pending}
        />
      </FormField>

      {state?.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <Button type="submit" className="w-full gap-2" disabled={pending}>
        <LogIn className="h-4 w-4" />
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </Button>
    </form>
  );
}

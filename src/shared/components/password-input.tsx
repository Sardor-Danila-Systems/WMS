"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

/**
 * Поле пароля с кнопкой показа введённого значения.
 *
 * Кнопка помогает поймать опечатку и раскладку клавиатуры — на складе логин
 * часто вводят с планшета. Значение показывается только по явному нажатию
 * и скрывается обратно тем же действием.
 */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const t = useT();
  const label = visible ? t("auth.hidePassword") : t("auth.showPassword");
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        // Место под кнопку, чтобы длинный пароль не уезжал под неё.
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Заголовок дублирует подпись: подсказка при наведении мышью.
        title={label}
        aria-label={label}
        aria-pressed={visible}
        disabled={props.disabled}
        className={cn(
          "absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md",
          "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        <Icon className="h-4 w-4" />
      </button>
    </div>
  );
}

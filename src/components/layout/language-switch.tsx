"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";

import { setLocale } from "@/app/actions/locale";
import { useIntlTag, useT } from "@/i18n/client";
import { LOCALES, type Locale } from "@/i18n/types";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = { ru: "RU", uz: "UZ" };

/**
 * Переключатель языка. Компактная пара кнопок, а не выпадающий список:
 * языков всего два, и выбор должен делаться одним касанием.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useT();
  const locale = useIntlTag();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-card p-0.5",
        isPending && "opacity-60",
        className
      )}
    >
      <Languages className="mx-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          disabled={isPending || code === locale}
          aria-pressed={code === locale}
          onClick={() => startTransition(() => setLocale(code))}
          className={cn(
            "rounded-[5px] px-2 py-1 text-[12.5px] font-medium transition-colors",
            code === locale
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}

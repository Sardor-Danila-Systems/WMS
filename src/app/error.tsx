"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/**
 * Понятный экран вместо системной страницы ошибки.
 * Пользователь склада не должен видеть технические подробности,
 * поэтому текст ошибки уходит в консоль, а на экране — что делать дальше.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("[wms] Ошибка страницы:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold tracking-tight">{t.errorPages.errorTitle}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {t.errorPages.errorHint}
        </p>
        <Button onClick={reset} className="mt-5 gap-2">
          <RotateCcw className="h-4 w-4" />
          {t.errorPages.retry}
        </Button>
      </div>
    </div>
  );
}

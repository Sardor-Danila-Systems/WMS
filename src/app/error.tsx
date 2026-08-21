"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

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
  useEffect(() => {
    console.error("[wms] Ошибка страницы:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5.5 w-5.5" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight">Не удалось открыть раздел</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Данные склада в безопасности — ни одна операция не была изменена.
          Попробуйте открыть раздел ещё раз.
        </p>
        <Button onClick={reset} className="mt-5 gap-2">
          <RotateCcw className="h-4 w-4" />
          Повторить
        </Button>
      </div>
    </div>
  );
}

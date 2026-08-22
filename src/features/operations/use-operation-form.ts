"use client";

import { useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { useT } from "@/i18n/client";

import type { ActionResult } from "@/app/actions/types";

/** Сегодняшняя дата в формате `YYYY-MM-DD` для input[type=date]. */
export function todayISODate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/**
 * Отправляет значения формы в server action и раскладывает результат:
 * ошибку поля — обратно в форму, общую ошибку — в toast.
 * Сервер остаётся единственным источником истины по остаткам, поэтому
 * его отказ всегда показывается пользователю дословно.
 */
export function useActionSubmit<TValues extends FieldValues>(options: {
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  setError: UseFormSetError<TValues>;
  successTitle: string;
  successDescription?: (values: TValues) => string | undefined;
  onSuccess?: () => void;
}) {
  const t = useT();
  const [isPending, setIsPending] = useState(false);

  async function submit(values: TValues) {
    setIsPending(true);
    try {
      const formData = new FormData();
      for (const [key, value] of Object.entries(values)) {
        if (value === undefined || value === null) continue;
        formData.append(key, String(value));
      }

      const result = await options.action(formData);

      if (!result.ok) {
        if (result.field) {
          options.setError(result.field as Path<TValues>, { message: result.error });
        }
        toast.error(result.error);
        return false;
      }

      toast.success(options.successTitle, {
        description: options.successDescription?.(values),
      });
      options.onSuccess?.();
      return true;
    } catch {
      toast.error(t.common.serverUnavailable);
      return false;
    } finally {
      setIsPending(false);
    }
  }

  return { submit, isPending };
}

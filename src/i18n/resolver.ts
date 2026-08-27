"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

import { useLooseT } from "./client";
import type { LooseTranslate } from "./loose";
import { translateValidation } from "./validation";

/**
 * Сообщения zod-схем — это ключи словаря: одна и та же схема работает и в
 * браузере, и на сервере, а язык у пользователя может быть любой. На сервере
 * ключ переводит `translateValidation`; здесь то же самое делается для проверки
 * в браузере, иначе под полем появлялось бы «validation.quantityRequired».
 */
function translateErrors(node: unknown, t: LooseTranslate, seen: Set<object>): void {
  if (!node || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    // ref — ссылка на DOM-узел поля, внутрь неё ходить незачем.
    if (key === "ref") continue;
    if (key === "message" && typeof value === "string") {
      (node as Record<string, unknown>).message = translateValidation(t, value);
      continue;
    }
    translateErrors(value, t, seen);
  }
}

export function useValidationResolver<TValues extends FieldValues>(
  schema: ZodType<unknown, TValues>
): Resolver<TValues> {
  const t = useLooseT();

  return useMemo(() => {
    const base = zodResolver(schema) as unknown as Resolver<TValues>;
    return async (values, context, options) => {
      const result = await base(values, context, options);
      translateErrors(result.errors, t, new Set());
      return result;
    };
  }, [schema, t]);
}

"use server";

import { refresh } from "next/cache";

import { requirePermission } from "@/lib/auth/dal";
import { getDictionary, getLocale } from "@/i18n/server";
import { translateValidation } from "@/i18n";
import { issueSchema, receiptSchema, returnSchema, usageSchema } from "@/lib/validation";
import { recordMovement } from "@/server/movements";
import { toActionError } from "@/server/errors";
import type { ActionResult } from "./types";

/** Дата в формате `ГГГГ-ММ-ДД` по местному времени сервера. */
function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Превращает дату из формы (`2026-08-21`) в момент времени.
 * Для «сегодня» подставляем текущее время, чтобы операции одного дня
 * шли в истории в правильном порядке, а не все в одно и то же время.
 *
 * Сравнивать нужно именно местные даты: браузер присылает дату по часовому
 * поясу пользователя, и сверка с UTC-датой давала бы «не сегодня» каждый раз,
 * когда местная дата уже сменилась, а UTC — ещё нет (для Москвы это ночные часы).
 */
function resolveOccurredAt(raw: string): string {
  const now = new Date();
  if (raw.length === 10) {
    if (raw === localDateKey(now)) return now.toISOString();
    // Прошедшая дата без времени — фиксируем на конец рабочего дня.
    return new Date(`${raw}T17:00:00`).toISOString();
  }
  return new Date(raw).toISOString();
}

function parseForm(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = value;
  }
  return raw;
}

/* ---------------------------- Поступление ---------------------------- */

export async function createReceipt(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("movement:create");
    const parsed = receiptSchema.safeParse(parseForm(formData));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        ok: false,
        error: translateValidation(await getDictionary(), issue.message),
        field: String(issue.path[0] ?? ""),
      };
    }

    await recordMovement({
      type: "RECEIPT",
      materialId: parsed.data.materialId,
      quantity: parsed.data.quantity,
      userId: user.id,
      occurredAt: resolveOccurredAt(parsed.data.occurredAt),
      supplierId: parsed.data.supplierId,
      vehicleNumber: parsed.data.vehicleNumber,
      comment: parsed.data.comment,
    });

    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, ...toActionError(error, await getDictionary(), await getLocale()) };
  }
}

/* ------------------------------- Выдача ------------------------------ */

export async function createIssue(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("movement:create");
    const parsed = issueSchema.safeParse(parseForm(formData));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        ok: false,
        error: translateValidation(await getDictionary(), issue.message),
        field: String(issue.path[0] ?? ""),
      };
    }

    await recordMovement({
      type: "ISSUE",
      materialId: parsed.data.materialId,
      quantity: parsed.data.quantity,
      userId: user.id,
      foremanId: parsed.data.foremanId,
      projectId: parsed.data.projectId,
      occurredAt: resolveOccurredAt(parsed.data.occurredAt),
      comment: parsed.data.comment,
    });

    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, ...toActionError(error, await getDictionary(), await getLocale()) };
  }
}

/* --------------------------- Использование --------------------------- */

export async function createUsage(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("movement:create");
    const parsed = usageSchema.safeParse(parseForm(formData));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        ok: false,
        error: translateValidation(await getDictionary(), issue.message),
        field: String(issue.path[0] ?? ""),
      };
    }

    await recordMovement({
      type: "USAGE",
      materialId: parsed.data.materialId,
      quantity: parsed.data.quantity,
      userId: user.id,
      foremanId: parsed.data.foremanId,
      projectId: parsed.data.projectId,
      occurredAt: resolveOccurredAt(parsed.data.occurredAt),
      comment: parsed.data.comment,
    });

    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, ...toActionError(error, await getDictionary(), await getLocale()) };
  }
}

/* ------------------------------ Возврат ------------------------------ */

export async function createReturn(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("movement:create");
    const parsed = returnSchema.safeParse(parseForm(formData));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        ok: false,
        error: translateValidation(await getDictionary(), issue.message),
        field: String(issue.path[0] ?? ""),
      };
    }

    await recordMovement({
      type: "RETURN",
      materialId: parsed.data.materialId,
      quantity: parsed.data.quantity,
      userId: user.id,
      foremanId: parsed.data.foremanId,
      occurredAt: resolveOccurredAt(parsed.data.occurredAt),
      reason: parsed.data.reason,
      comment: parsed.data.comment,
    });

    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, ...toActionError(error, await getDictionary(), await getLocale()) };
  }
}

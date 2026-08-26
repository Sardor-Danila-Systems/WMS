"use server";

import { refresh } from "next/cache";

import { requirePermission } from "@/lib/auth/dal";
import { getIntlTag, getLooseT, getValueTranslator } from "@/i18n/server";
import { translateValidation } from "@/i18n/validation";
import { issueSchema, receiptSchema, returnSchema } from "@/lib/validation";
import { recordMovement } from "@/server/movements";
import { toActionError } from "@/server/errors";
import type { PaymentMethod } from "@/types";
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
 * когда местная дата уже сменилась, а UTC — ещё нет.
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

/** Пустое поле цены значит «взять текущую цену материала», а не «ноль». */
function resolvePrice(value: number | "" | undefined): number | null {
  return value === "" || value === undefined ? null : Number(value);
}

function resolvePayment(value: string | undefined): PaymentMethod | null {
  return value === "CASH" || value === "TRANSFER" ? value : null;
}

function parseForm(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = value;
  }
  return raw;
}

async function failure(error: { issues: { message: string; path: PropertyKey[] }[] }) {
  const issue = error.issues[0];
  return {
    ok: false as const,
    error: translateValidation(await getLooseT(), issue.message),
    field: String(issue.path[0] ?? ""),
  };
}

async function crash(error: unknown) {
  return {
    ok: false as const,
    ...toActionError(
      error,
      await getLooseT(),
      await getIntlTag(),
      await getValueTranslator("units")
    ),
  };
}

/* ------------------------------- Приход ------------------------------ */

export async function createReceipt(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("movement:create");
    const parsed = receiptSchema.safeParse(parseForm(formData));
    if (!parsed.success) return await failure(parsed.error);

    await recordMovement({
      type: "RECEIPT",
      materialId: parsed.data.materialId,
      quantity: parsed.data.quantity,
      unitPrice: resolvePrice(parsed.data.unitPrice),
      userId: user.id,
      occurredAt: resolveOccurredAt(parsed.data.occurredAt),
      supplierId: parsed.data.supplierId,
      organizationId: parsed.data.organizationId,
      invoiceNumber: parsed.data.invoiceNumber,
      vehicleNumber: parsed.data.vehicleNumber,
      paymentMethod: resolvePayment(parsed.data.paymentMethod),
      comment: parsed.data.comment,
    });

    refresh();
    return { ok: true };
  } catch (error) {
    return await crash(error);
  }
}

/* ------------------------------- Расход ------------------------------ */

export async function createIssue(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("movement:create");
    const parsed = issueSchema.safeParse(parseForm(formData));
    if (!parsed.success) return await failure(parsed.error);

    await recordMovement({
      type: "ISSUE",
      materialId: parsed.data.materialId,
      quantity: parsed.data.quantity,
      unitPrice: resolvePrice(parsed.data.unitPrice),
      userId: user.id,
      blockId: parsed.data.blockId,
      organizationId: parsed.data.organizationId,
      invoiceNumber: parsed.data.invoiceNumber,
      vehicleNumber: parsed.data.vehicleNumber,
      paymentMethod: resolvePayment(parsed.data.paymentMethod),
      occurredAt: resolveOccurredAt(parsed.data.occurredAt),
      comment: parsed.data.comment,
    });

    refresh();
    return { ok: true };
  } catch (error) {
    return await crash(error);
  }
}

/* ------------------------------ Возврат ------------------------------ */

export async function createReturn(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("movement:create");
    const parsed = returnSchema.safeParse(parseForm(formData));
    if (!parsed.success) return await failure(parsed.error);

    await recordMovement({
      type: "RETURN",
      materialId: parsed.data.materialId,
      quantity: parsed.data.quantity,
      userId: user.id,
      blockId: parsed.data.blockId,
      occurredAt: resolveOccurredAt(parsed.data.occurredAt),
      reason: parsed.data.reason,
      comment: parsed.data.comment,
    });

    refresh();
    return { ok: true };
  } catch (error) {
    return await crash(error);
  }
}

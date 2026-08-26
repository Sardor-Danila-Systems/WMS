"use server";

import { refresh } from "next/cache";

import { requirePermission } from "@/lib/auth/dal";
import { getIntlTag, getLooseT, getT, getValueTranslator } from "@/i18n/server";
import { translateValidation } from "@/i18n/validation";
import {
  blockSchema,
  materialPriceSchema,
  materialSchema,
  organizationSchema,
  supplierSchema,
  userSchema,
} from "@/lib/validation";
import {
  createBlock,
  createMaterial,
  createOrganization,
  createSupplier,
  createUser,
  deleteMaterial,
  setMaterialArchived,
  setSetting,
  updateBlock,
  updateMaterial,
  updateMaterialPrice,
  updateOrganization,
  updateSupplier,
  updateUser,
} from "@/server/catalog";
import { toActionError } from "@/server/errors";
import type { Role } from "@/types";
import type { ActionResult } from "./types";

function parseForm(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) raw[key] = value;
  return raw;
}

async function firstIssue(error: { issues: { message: string; path: PropertyKey[] }[] }) {
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

/* ------------------------------ Материалы ---------------------------- */

export async function saveMaterial(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("material:write");
    const id = String(formData.get("id") ?? "").trim();
    const parsed = materialSchema.safeParse(parseForm(formData));
    if (!parsed.success) return await firstIssue(parsed.error);

    if (id) {
      await updateMaterial(id, {
        name: parsed.data.name,
        category: parsed.data.category,
        unit: parsed.data.unit,
        price: parsed.data.price,
        minStock: parsed.data.minStock,
      });
      refresh();
      return { ok: true, data: { id } };
    }

    const created = await createMaterial({
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      price: parsed.data.price,
      minStock: parsed.data.minStock,
      initialQuantity: parsed.data.initialQuantity,
      userId: user.id,
      initialStockComment: (await getT())("seed.initialStockComment"),
    });
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return await crash(error);
  }
}

/** Быстрая правка цены прямо в списке материалов. */
export async function saveMaterialPrice(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("material:write");
    const parsed = materialPriceSchema.safeParse(parseForm(formData));
    if (!parsed.success) return await firstIssue(parsed.error);

    await updateMaterialPrice(parsed.data.id, parsed.data.price);
    refresh();
    return { ok: true, data: { id: parsed.data.id } };
  } catch (error) {
    return await crash(error);
  }
}

export async function removeMaterial(id: string): Promise<ActionResult> {
  try {
    await requirePermission("material:delete");
    await deleteMaterial(id);
    refresh();
    return { ok: true };
  } catch (error) {
    return await crash(error);
  }
}

export async function archiveMaterial(id: string, archived: boolean): Promise<ActionResult> {
  try {
    await requirePermission("material:write");
    await setMaterialArchived(id, archived);
    refresh();
    return { ok: true };
  } catch (error) {
    return await crash(error);
  }
}

/* -------------------------------- Блоки ------------------------------ */

export async function saveBlock(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("block:write");
    const id = String(formData.get("id") ?? "").trim();
    const parsed = blockSchema.safeParse({
      ...parseForm(formData),
      isActive: formData.get("isActive") !== "false",
    });
    if (!parsed.success) return await firstIssue(parsed.error);

    if (id) {
      await updateBlock(id, parsed.data);
      refresh();
      return { ok: true, data: { id } };
    }
    const created = await createBlock(parsed.data);
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return await crash(error);
  }
}

/* ----------------------------- Организации --------------------------- */

export async function saveOrganization(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("organization:write");
    const id = String(formData.get("id") ?? "").trim();
    const parsed = organizationSchema.safeParse({
      ...parseForm(formData),
      isActive: formData.get("isActive") !== "false",
    });
    if (!parsed.success) return await firstIssue(parsed.error);

    if (id) {
      await updateOrganization(id, parsed.data);
      refresh();
      return { ok: true, data: { id } };
    }
    const created = await createOrganization(parsed.data);
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return await crash(error);
  }
}

/* ------------------------------ Поставщики --------------------------- */

export async function saveSupplier(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("supplier:write");
    const id = String(formData.get("id") ?? "").trim();
    const parsed = supplierSchema.safeParse({
      ...parseForm(formData),
      isActive: formData.get("isActive") !== "false",
    });
    if (!parsed.success) return await firstIssue(parsed.error);

    if (id) {
      await updateSupplier(id, parsed.data);
      refresh();
      return { ok: true, data: { id } };
    }
    const created = await createSupplier(parsed.data);
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return await crash(error);
  }
}

/* ------------------------------ Сотрудники --------------------------- */

export async function saveUser(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("user:write");
    const id = String(formData.get("id") ?? "").trim();
    const raw = parseForm(formData);

    if (id) {
      // При редактировании пароль необязателен — пустое поле означает «не менять».
      const password = String(raw.password ?? "").trim();
      if (password && password.length < 6) {
        return {
          ok: false,
          error: (await getT())("validation.passwordMin"),
          field: "password",
        };
      }
      const editSchema = userSchema.omit({ password: true, username: true });
      const parsed = editSchema.safeParse(raw);
      if (!parsed.success) return await firstIssue(parsed.error);

      await updateUser(id, {
        ...parsed.data,
        isActive: formData.get("isActive") !== "false",
        password: password || undefined,
      });
      refresh();
      return { ok: true, data: { id } };
    }

    const parsed = userSchema.safeParse(raw);
    if (!parsed.success) return await firstIssue(parsed.error);
    const created = await createUser({ ...parsed.data, role: parsed.data.role as Role });
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return await crash(error);
  }
}

/* ------------------------------- Настройки --------------------------- */

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("settings:write");
    await setSetting("company_name", String(formData.get("companyName") ?? "").trim());
    await setSetting("warehouse_address", String(formData.get("warehouseAddress") ?? "").trim());
    await setSetting("currency", String(formData.get("currency") ?? "").trim());
    refresh();
    return { ok: true };
  } catch (error) {
    return await crash(error);
  }
}

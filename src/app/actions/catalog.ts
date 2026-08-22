"use server";

import { refresh } from "next/cache";

import { requirePermission } from "@/lib/auth/dal";
import { getDictionary, getLocale } from "@/i18n/server";
import { translateValidation } from "@/i18n";
import {
  foremanSchema,
  materialSchema,
  projectSchema,
  supplierSchema,
  userSchema,
} from "@/lib/validation";
import {
  createForeman,
  createMaterial,
  createProject,
  createSupplier,
  createUser,
  deleteMaterial,
  setMaterialArchived,
  setSetting,
  updateForeman,
  updateMaterial,
  updateProject,
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
    error: translateValidation(await getDictionary(), issue.message),
    field: String(issue.path[0] ?? ""),
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
        minStock: parsed.data.minStock,
      });
      refresh();
      return { ok: true, data: { id } };
    }

    const created = await createMaterial({
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      minStock: parsed.data.minStock,
      initialQuantity: parsed.data.initialQuantity,
      userId: user.id,
      initialStockComment: (await getDictionary()).seed.initialStockComment,
    });
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return { ok: false, ...toActionError(error, await getDictionary(), await getLocale()) };
  }
}

export async function removeMaterial(id: string): Promise<ActionResult> {
  try {
    await requirePermission("material:delete");
    await deleteMaterial(id);
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, ...toActionError(error, await getDictionary(), await getLocale()) };
  }
}

export async function archiveMaterial(id: string, archived: boolean): Promise<ActionResult> {
  try {
    await requirePermission("material:write");
    await setMaterialArchived(id, archived);
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, ...toActionError(error, await getDictionary(), await getLocale()) };
  }
}

/* ------------------------------ Бригадиры ---------------------------- */

export async function saveForeman(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("foreman:write");
    const id = String(formData.get("id") ?? "").trim();
    const parsed = foremanSchema.safeParse({
      ...parseForm(formData),
      isActive: formData.get("isActive") !== "false",
    });
    if (!parsed.success) return await firstIssue(parsed.error);

    if (id) {
      await updateForeman(id, parsed.data);
      refresh();
      return { ok: true, data: { id } };
    }
    const created = await createForeman(parsed.data);
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return { ok: false, ...toActionError(error, await getDictionary(), await getLocale()) };
  }
}

/* -------------------------------- Объекты ---------------------------- */

export async function saveProject(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("project:write");
    const id = String(formData.get("id") ?? "").trim();
    const parsed = projectSchema.safeParse({
      ...parseForm(formData),
      isActive: formData.get("isActive") !== "false",
    });
    if (!parsed.success) return await firstIssue(parsed.error);

    if (id) {
      await updateProject(id, parsed.data);
      refresh();
      return { ok: true, data: { id } };
    }
    const created = await createProject(parsed.data);
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return { ok: false, ...toActionError(error, await getDictionary(), await getLocale()) };
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
    return { ok: false, ...toActionError(error, await getDictionary(), await getLocale()) };
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
          error: (await getDictionary()).validation.passwordMin,
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
    return { ok: false, ...toActionError(error, await getDictionary(), await getLocale()) };
  }
}

/* ------------------------------- Настройки --------------------------- */

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("settings:write");
    await setSetting("company_name", String(formData.get("companyName") ?? "").trim());
    await setSetting("warehouse_address", String(formData.get("warehouseAddress") ?? "").trim());
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, ...toActionError(error, await getDictionary(), await getLocale()) };
  }
}

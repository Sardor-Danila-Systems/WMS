"use server";

import { refresh } from "next/cache";

import { requirePermission } from "@/lib/auth/dal";
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

function firstIssue(error: { issues: { message: string; path: PropertyKey[] }[] }) {
  const issue = error.issues[0];
  return { ok: false as const, error: issue.message, field: String(issue.path[0] ?? "") };
}

/* ------------------------------ Материалы ---------------------------- */

export async function saveMaterial(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("material:write");
    const id = String(formData.get("id") ?? "").trim();
    const parsed = materialSchema.safeParse(parseForm(formData));
    if (!parsed.success) return firstIssue(parsed.error);

    if (id) {
      updateMaterial(id, {
        name: parsed.data.name,
        category: parsed.data.category,
        unit: parsed.data.unit,
        minStock: parsed.data.minStock,
      });
      refresh();
      return { ok: true, data: { id } };
    }

    const created = createMaterial({
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      minStock: parsed.data.minStock,
      initialQuantity: parsed.data.initialQuantity,
      userId: user.id,
    });
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return { ok: false, ...toActionError(error) };
  }
}

export async function removeMaterial(id: string): Promise<ActionResult> {
  try {
    await requirePermission("material:delete");
    deleteMaterial(id);
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, ...toActionError(error) };
  }
}

export async function archiveMaterial(id: string, archived: boolean): Promise<ActionResult> {
  try {
    await requirePermission("material:write");
    setMaterialArchived(id, archived);
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, ...toActionError(error) };
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
    if (!parsed.success) return firstIssue(parsed.error);

    if (id) {
      updateForeman(id, parsed.data);
      refresh();
      return { ok: true, data: { id } };
    }
    const created = createForeman(parsed.data);
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return { ok: false, ...toActionError(error) };
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
    if (!parsed.success) return firstIssue(parsed.error);

    if (id) {
      updateProject(id, parsed.data);
      refresh();
      return { ok: true, data: { id } };
    }
    const created = createProject(parsed.data);
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return { ok: false, ...toActionError(error) };
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
    if (!parsed.success) return firstIssue(parsed.error);

    if (id) {
      updateSupplier(id, parsed.data);
      refresh();
      return { ok: true, data: { id } };
    }
    const created = createSupplier(parsed.data);
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return { ok: false, ...toActionError(error) };
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
        return { ok: false, error: "Пароль минимум 6 символов", field: "password" };
      }
      const editSchema = userSchema.omit({ password: true, username: true });
      const parsed = editSchema.safeParse(raw);
      if (!parsed.success) return firstIssue(parsed.error);

      updateUser(id, {
        ...parsed.data,
        isActive: formData.get("isActive") !== "false",
        password: password || undefined,
      });
      refresh();
      return { ok: true, data: { id } };
    }

    const parsed = userSchema.safeParse(raw);
    if (!parsed.success) return firstIssue(parsed.error);
    const created = createUser({ ...parsed.data, role: parsed.data.role as Role });
    refresh();
    return { ok: true, data: created };
  } catch (error) {
    return { ok: false, ...toActionError(error) };
  }
}

/* ------------------------------- Настройки --------------------------- */

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("settings:write");
    setSetting("company_name", String(formData.get("companyName") ?? "").trim());
    setSetting("warehouse_address", String(formData.get("warehouseAddress") ?? "").trim());
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, ...toActionError(error) };
  }
}

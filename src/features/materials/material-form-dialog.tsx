"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import type { z } from "zod";

import { saveMaterial } from "@/app/actions/catalog";
import { materialSchema } from "@/lib/validation";
import { CATEGORIES, UNITS } from "@/constants/categories";
import { useT } from "@/i18n/client";
import { useValueTranslator } from "@/i18n/values";
import { FormField } from "@/shared/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SelectField } from "@/features/operations/fields";
import { useActionSubmit } from "@/features/operations/use-operation-form";
import type { Material } from "@/types";

type Values = z.input<typeof materialSchema> & { id?: string };

export function MaterialFormDialog({
  material,
  hasHistory,
}: {
  material?: Material;
  hasHistory?: boolean;
}) {
  const t = useT();
  const unitLabel = useValueTranslator("units");
  const categoryLabel = useValueTranslator("categories");
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(material);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: material?.name ?? "",
      category: material?.category ?? "",
      unit: material?.unit ?? "",
      minStock: (material?.minStock ?? "") as unknown as number,
      initialQuantity: "" as unknown as number,
    },
  });

  const { submit, isPending } = useActionSubmit<Values>({
    action: saveMaterial,
    setError,
    successTitle: isEdit ? t("materials.saved") : t("materials.created"),
    onSuccess: () => {
      setOpen(false);
      if (!isEdit) reset();
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && !isEdit) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant={isEdit ? "outline" : "default"}
            className="gap-1.5"
            aria-label={isEdit ? t("common.edit") : undefined}
          />
        }
      >
        {isEdit ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {isEdit ? t("common.edit") : t("materials.add")}
      </DialogTrigger>

      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("materials.edit") : t("materials.create")}</DialogTitle>
          <DialogDescription>
{isEdit ? t("materials.editHint") : t("materials.createHint")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => submit({ ...values, id: material?.id }))}
          className="space-y-4"
        >
          <FormField label={t("materials.name")} required error={errors.name?.message}>
            <Input
              placeholder={t("materials.namePlaceholder")}
              autoFocus
              disabled={isPending}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              control={control}
              name="category"
              label={t("materials.category")}
              placeholder={t("materials.categoryPlaceholder")}
              required
              error={errors.category?.message}
              disabled={isPending}
              options={CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) }))}
            />

            <SelectField
              control={control}
              name="unit"
              label={t("materials.unit")}
              placeholder={t("materials.unitPlaceholder")}
              required
              error={errors.unit?.message}
              disabled={isPending || hasHistory}
              options={UNITS.map((u) => ({ value: u, label: unitLabel(u) }))}
            >
              {hasHistory && (
                <p className="text-[13px] text-muted-foreground">
{t("materials.unitLocked")}
                </p>
              )}
            </SelectField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t("materials.minStock")} required error={errors.minStock?.message}>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                disabled={isPending}
                aria-invalid={Boolean(errors.minStock)}
                {...register("minStock")}
              />
            </FormField>

            {!isEdit && (
              <FormField label={t("materials.initialQuantity")} error={errors.initialQuantity?.message}>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  disabled={isPending}
                  {...register("initialQuantity")}
                />
              </FormField>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("common.saving") : isEdit ? t("common.save") : t("materials.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

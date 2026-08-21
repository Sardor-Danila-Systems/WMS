"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import type { z } from "zod";

import { saveMaterial } from "@/app/actions/catalog";
import { materialSchema } from "@/lib/validation";
import { CATEGORIES, UNITS } from "@/constants/categories";
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
    successTitle: isEdit ? "Материал обновлён" : "Материал добавлен",
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
            aria-label={isEdit ? "Редактировать материал" : undefined}
          />
        }
      >
        {isEdit ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {isEdit ? "Редактировать" : "Добавить материал"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактирование материала" : "Новый материал"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Изменения не затрагивают уже проведённые операции."
              : "Начальный остаток будет записан как поступление на склад."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => submit({ ...values, id: material?.id }))}
          className="space-y-4"
        >
          <FormField label="Название" required error={errors.name?.message}>
            <Input
              placeholder="Например, Цемент М500"
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
              label="Категория"
              placeholder="Выберите категорию"
              required
              error={errors.category?.message}
              disabled={isPending}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />

            <SelectField
              control={control}
              name="unit"
              label="Единица измерения"
              placeholder="Выберите единицу"
              required
              error={errors.unit?.message}
              disabled={isPending || hasHistory}
              options={UNITS.map((u) => ({ value: u, label: u }))}
            >
              {hasHistory && (
                <p className="text-xs text-muted-foreground">
                  По материалу есть движения — единицу изменить нельзя
                </p>
              )}
            </SelectField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Минимальный остаток" required error={errors.minStock?.message}>
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
              <FormField label="Начальный остаток" error={errors.initialQuantity?.message}>
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
              {isPending ? "Сохраняем..." : isEdit ? "Сохранить" : "Добавить материал"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

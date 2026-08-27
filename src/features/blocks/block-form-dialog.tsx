"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import type { z } from "zod";

import { saveBlock } from "@/app/actions/catalog";
import { blockSchema } from "@/lib/validation";
import { FormField } from "@/shared/components/form-field";
import { useT } from "@/i18n/client";
import { useValidationResolver } from "@/i18n/resolver";
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
import type { Block, Organization } from "@/types";

type Values = z.input<typeof blockSchema> & { id?: string };

export function BlockFormDialog({
  block,
  organizations,
  nextSortOrder = 0,
}: {
  block?: Block;
  organizations: Organization[];
  /** Новый блок встаёт в конец списка, а не перед блоком A. */
  nextSortOrder?: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(block);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: useValidationResolver<Values>(blockSchema),
    defaultValues: {
      name: block?.name ?? "",
      description: block?.description ?? "",
      organizationId: block?.organizationId ?? (organizations.length === 1 ? organizations[0].id : ""),
      sortOrder: block?.sortOrder ?? nextSortOrder,
      isActive: block?.isActive ?? true,
    },
  });

  const { submit, isPending } = useActionSubmit<Values>({
    action: saveBlock,
    setError,
    successTitle: isEdit ? t("blocks.saved") : t("blocks.created"),
    onSuccess: () => {
      setOpen(false);
      if (!isEdit) reset();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant={isEdit ? "outline" : "default"} className="gap-1.5" />}
      >
        {isEdit ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {isEdit ? t("common.edit") : t("blocks.add")}
      </DialogTrigger>

      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("blocks.edit") : t("blocks.create")}</DialogTitle>
          <DialogDescription>{t("blocks.hint")}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => submit({ ...values, id: block?.id }))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t("blocks.name")} required error={errors.name?.message}>
              <Input
                placeholder={t("blocks.namePlaceholder")}
                autoFocus
                disabled={isPending}
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            </FormField>

            <FormField label={t("blocks.description")} error={errors.description?.message}>
              <Input
                placeholder={t("blocks.descriptionPlaceholder")}
                disabled={isPending}
                {...register("description")}
              />
            </FormField>
          </div>

          <SelectField
            control={control}
            name="organizationId"
            label={t("operations.organization")}
            placeholder={t("blocks.organizationPlaceholder")}
            error={errors.organizationId?.message}
            disabled={isPending}
            options={organizations.map((o) => ({ value: o.id, label: o.name }))}
          />

          <FormField
            label={t("blocks.sortOrder")}
            error={errors.sortOrder?.message}
            hint={t("blocks.sortOrderHint")}
          >
            <Input type="number" min="0" step="1" disabled={isPending} {...register("sortOrder")} />
          </FormField>

          {isEdit && (
            <FormField label={t("common.status")}>
              <label className="flex items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  disabled={isPending}
                  {...register("isActive")}
                />
                {t("blocks.activeLabel")}
              </label>
            </FormField>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("common.saving") : isEdit ? t("common.save") : t("common.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

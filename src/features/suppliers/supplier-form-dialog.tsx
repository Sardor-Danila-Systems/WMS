"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import type { z } from "zod";

import { saveSupplier } from "@/app/actions/catalog";
import { supplierSchema } from "@/lib/validation";
import { FormField } from "@/shared/components/form-field";
import { useT } from "@/i18n/client";
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
import { useActionSubmit } from "@/features/operations/use-operation-form";
import type { Supplier } from "@/types";

type Values = z.input<typeof supplierSchema> & { id?: string };

export function SupplierFormDialog({ supplier }: { supplier?: Supplier }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(supplier);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? "",
      contact: supplier?.contact ?? "",
      phone: supplier?.phone ?? "",
      inn: supplier?.inn ?? "",
      isActive: supplier?.isActive ?? true,
    },
  });

  const { submit, isPending } = useActionSubmit<Values>({
    action: saveSupplier,
    setError,
    successTitle: isEdit ? t("suppliers.saved") : t("suppliers.created"),
    onSuccess: () => {
      setOpen(false);
      if (!isEdit) reset();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        {isEdit ? t("common.edit") : t("suppliers.add")}
      </DialogTrigger>

      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("suppliers.edit") : t("suppliers.create")}</DialogTitle>
          <DialogDescription>{t("suppliers.hint")}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => submit({ ...values, id: supplier?.id }))}
          className="space-y-4"
        >
          <FormField label={t("suppliers.name")} required error={errors.name?.message}>
            <Input
              placeholder={t("suppliers.namePlaceholder")}
              autoFocus
              disabled={isPending}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t("suppliers.contact")} error={errors.contact?.message}>
              <Input
                placeholder={t("suppliers.contactPlaceholder")}
                disabled={isPending}
                {...register("contact")}
              />
            </FormField>

            <FormField label={t("suppliers.phone")} error={errors.phone?.message}>
              <Input
                placeholder={t("suppliers.phonePlaceholder")}
                disabled={isPending}
                {...register("phone")}
              />
            </FormField>
          </div>

          <FormField label={t("suppliers.inn")} error={errors.inn?.message}>
            <Input
              placeholder={t("suppliers.innPlaceholder")}
              disabled={isPending}
              {...register("inn")}
            />
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
                {t("suppliers.activeLabel")}
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

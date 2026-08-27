"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import type { z } from "zod";

import { saveOrganization } from "@/app/actions/catalog";
import { organizationSchema } from "@/lib/validation";
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
import { useActionSubmit } from "@/features/operations/use-operation-form";
import type { Organization } from "@/types";

type Values = z.input<typeof organizationSchema> & { id?: string };

export function OrganizationFormDialog({ organization }: { organization?: Organization }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(organization);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: useValidationResolver<Values>(organizationSchema),
    defaultValues: {
      name: organization?.name ?? "",
      address: organization?.address ?? "",
      inn: organization?.inn ?? "",
      phone: organization?.phone ?? "",
      isActive: organization?.isActive ?? true,
    },
  });

  const { submit, isPending } = useActionSubmit<Values>({
    action: saveOrganization,
    setError,
    successTitle: isEdit ? t("organizations.saved") : t("organizations.created"),
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
        {isEdit ? t("common.edit") : t("organizations.add")}
      </DialogTrigger>

      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("organizations.edit") : t("organizations.create")}</DialogTitle>
          <DialogDescription>{t("organizations.hint")}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => submit({ ...values, id: organization?.id }))}
          className="space-y-4"
        >
          <FormField label={t("organizations.name")} required error={errors.name?.message}>
            <Input
              placeholder={t("organizations.namePlaceholder")}
              autoFocus
              disabled={isPending}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>

          <FormField label={t("organizations.address")} error={errors.address?.message}>
            <Input
              placeholder={t("organizations.addressPlaceholder")}
              disabled={isPending}
              {...register("address")}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t("organizations.inn")} error={errors.inn?.message}>
              <Input
                placeholder={t("organizations.innPlaceholder")}
                disabled={isPending}
                {...register("inn")}
              />
            </FormField>

            <FormField label={t("organizations.phone")} error={errors.phone?.message}>
              <Input
                placeholder={t("organizations.phonePlaceholder")}
                disabled={isPending}
                {...register("phone")}
              />
            </FormField>
          </div>

          {isEdit && (
            <FormField label={t("common.status")}>
              <label className="flex items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  disabled={isPending}
                  {...register("isActive")}
                />
                {t("organizations.activeLabel")}
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

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import type { z } from "zod";

import { saveProject } from "@/app/actions/catalog";
import { projectSchema } from "@/lib/validation";
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
import type { Project } from "@/types";

type Values = z.input<typeof projectSchema> & { id?: string };

export function ProjectFormDialog({ project }: { project?: Project }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(project);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      address: project?.address ?? "",
      isActive: project?.isActive ?? true,
    },
  });

  const { submit, isPending } = useActionSubmit<Values>({
    action: saveProject,
    setError,
    successTitle: isEdit ? t("projects.saved") : t("projects.created"),
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
        {isEdit ? t("common.edit") : t("projects.add")}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("projects.edit") : t("projects.create")}</DialogTitle>
          <DialogDescription>
            {t("projects.hint")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => submit({ ...values, id: project?.id }))}
          className="space-y-4"
        >
          <FormField label={t("projects.name")} required error={errors.name?.message}>
            <Input
              placeholder={t("projects.namePlaceholder")}
              autoFocus
              disabled={isPending}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>

          <FormField label={t("projects.address")} error={errors.address?.message}>
            <Input placeholder={t("projects.addressPlaceholder")} disabled={isPending} {...register("address")} />
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
                {t("projects.activeLabel")}
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

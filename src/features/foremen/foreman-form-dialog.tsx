"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import type { z } from "zod";

import { saveForeman } from "@/app/actions/catalog";
import { foremanSchema } from "@/lib/validation";
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
import { SelectField } from "@/features/operations/fields";
import { useActionSubmit } from "@/features/operations/use-operation-form";
import type { Foreman, Project } from "@/types";

type Values = z.input<typeof foremanSchema> & { id?: string };

export function ForemanFormDialog({
  foreman,
  projects,
}: {
  foreman?: Foreman;
  projects: Project[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(foreman);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(foremanSchema),
    defaultValues: {
      name: foreman?.name ?? "",
      phone: foreman?.phone ?? "",
      brigade: foreman?.brigade ?? "",
      projectId: foreman?.projectId ?? "",
      isActive: foreman?.isActive ?? true,
    },
  });

  const { submit, isPending } = useActionSubmit<Values>({
    action: saveForeman,
    setError,
    successTitle: isEdit ? t.foremen.saved : t.foremen.created,
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
        {isEdit ? t.common.edit : t.foremen.add}
      </DialogTrigger>

      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t.foremen.edit : t.foremen.create}</DialogTitle>
          <DialogDescription>
            {t.foremen.hint}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => submit({ ...values, id: foreman?.id }))}
          className="space-y-4"
        >
          <FormField label={t.foremen.fullName} required error={errors.name?.message}>
            <Input
              placeholder={t.foremen.namePlaceholder}
              autoFocus
              disabled={isPending}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.foremen.phone} error={errors.phone?.message}>
              <Input placeholder={t.foremen.phonePlaceholder} disabled={isPending} {...register("phone")} />
            </FormField>

            <FormField label={t.foremen.brigade} error={errors.brigade?.message}>
              <Input placeholder={t.foremen.brigadePlaceholder} disabled={isPending} {...register("brigade")} />
            </FormField>
          </div>

          <SelectField
            control={control}
            name="projectId"
            label={t.operations.project}
            placeholder={t.foremen.projectPlaceholder}
            error={errors.projectId?.message}
            disabled={isPending}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
          />

          {isEdit && (
            <FormField label={t.common.status}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  disabled={isPending}
                  {...register("isActive")}
                />
                {t.foremen.activeLabel}
              </label>
            </FormField>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? t.common.saving : isEdit ? t.common.save : t.common.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import type { z } from "zod";

import { saveProject } from "@/app/actions/catalog";
import { projectSchema } from "@/lib/validation";
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
import { useActionSubmit } from "@/features/operations/use-operation-form";
import type { Project } from "@/types";

type Values = z.input<typeof projectSchema> & { id?: string };

export function ProjectFormDialog({ project }: { project?: Project }) {
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
    successTitle: isEdit ? "Объект обновлён" : "Объект добавлен",
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
        {isEdit ? "Редактировать" : "Добавить объект"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактирование объекта" : "Новый объект"}</DialogTitle>
          <DialogDescription>
            Объект — стройка, на которую бригады забирают материалы со склада.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => submit({ ...values, id: project?.id }))}
          className="space-y-4"
        >
          <FormField label="Название" required error={errors.name?.message}>
            <Input
              placeholder="Например, ЖК «Северный парк», корпус 3"
              autoFocus
              disabled={isPending}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>

          <FormField label="Адрес" error={errors.address?.message}>
            <Input placeholder="г. Москва, ул. ..." disabled={isPending} {...register("address")} />
          </FormField>

          {isEdit && (
            <FormField label="Статус">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  disabled={isPending}
                  {...register("isActive")}
                />
                Объект активен
              </label>
            </FormField>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохраняем..." : isEdit ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import type { z } from "zod";

import { saveForeman } from "@/app/actions/catalog";
import { foremanSchema } from "@/lib/validation";
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
import type { Foreman, Project } from "@/types";

type Values = z.input<typeof foremanSchema> & { id?: string };

export function ForemanFormDialog({
  foreman,
  projects,
}: {
  foreman?: Foreman;
  projects: Project[];
}) {
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
    successTitle: isEdit ? "Данные бригадира обновлены" : "Бригадир добавлен",
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
        {isEdit ? "Редактировать" : "Добавить бригадира"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактирование бригадира" : "Новый бригадир"}</DialogTitle>
          <DialogDescription>
            Бригадир получает материалы со склада и отчитывается за их расход.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => submit({ ...values, id: foreman?.id }))}
          className="space-y-4"
        >
          <FormField label="ФИО" required error={errors.name?.message}>
            <Input
              placeholder="Например, Александр Быков"
              autoFocus
              disabled={isPending}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Телефон" error={errors.phone?.message}>
              <Input placeholder="+7 (900) 000-00-00" disabled={isPending} {...register("phone")} />
            </FormField>

            <FormField label="Бригада" error={errors.brigade?.message}>
              <Input placeholder="Бригада №1" disabled={isPending} {...register("brigade")} />
            </FormField>
          </div>

          <SelectField
            control={control}
            name="projectId"
            label="Объект"
            placeholder="Где работает бригада"
            error={errors.projectId?.message}
            disabled={isPending}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
          />

          {isEdit && (
            <FormField label="Статус">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  disabled={isPending}
                  {...register("isActive")}
                />
                Активен — может получать материалы
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

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { createIssue } from "@/app/actions/movements";
import { issueSchema } from "@/lib/validation";
import { formatQuantity } from "@/lib/format";
import { FormField } from "@/shared/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { SelectField, QuantityInput, AvailableHint } from "./fields";
import { todayISODate, useActionSubmit } from "./use-operation-form";
import type { OperationRefData } from "./types";

type Values = z.input<typeof issueSchema>;

export function IssueForm({ data, onSuccess }: { data: OperationRefData; onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      foremanId: "",
      materialId: "",
      quantity: "" as unknown as number,
      projectId: "",
      occurredAt: todayISODate(),
      comment: "",
    },
  });

  const foremanId = watch("foremanId");
  const material = data.materials.find((m) => m.id === watch("materialId"));
  const quantity = Number(watch("quantity"));

  // Объект подставляется из карточки бригадира — обычно бригада работает
  // на закреплённом объекте, и лишний выбор только замедляет оформление.
  const foreman = data.foremen.find((f) => f.id === foremanId);
  useEffect(() => {
    if (foreman?.projectId) setValue("projectId", foreman.projectId);
  }, [foreman?.projectId, setValue]);

  const exceedsStock = Boolean(material) && quantity > 0 && quantity > material!.quantity;

  const { submit, isPending } = useActionSubmit<Values>({
    action: createIssue,
    setError,
    successTitle: "Выдача оформлена",
    successDescription: (values) =>
      material
        ? `Со склада списано ${formatQuantity(Number(values.quantity), material.unit)}, материал закреплён за бригадиром`
        : undefined,
    onSuccess,
  });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <SelectField
        control={control}
        name="foremanId"
        label="Бригадир"
        placeholder="Кому выдаём материал"
        required
        error={errors.foremanId?.message}
        disabled={isPending}
        options={data.foremen.map((f) => ({ value: f.id, label: f.name, hint: f.brigade }))}
      />

      <SelectField
        control={control}
        name="materialId"
        label="Материал"
        placeholder="Что выдаём"
        required
        error={errors.materialId?.message}
        disabled={isPending}
        options={data.materials.map((m) => ({
          value: m.id,
          label: m.name,
          hint: formatQuantity(m.quantity, m.unit),
        }))}
      >
        {material && (
          <AvailableHint available={material.quantity} unit={material.unit} label="Доступно на складе" />
        )}
      </SelectField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Количество"
          required
          error={errors.quantity?.message ?? (exceedsStock ? "Больше, чем есть на складе" : undefined)}
        >
          <QuantityInput
            unit={material?.unit}
            max={material?.quantity}
            invalid={Boolean(errors.quantity) || exceedsStock}
            disabled={isPending}
            {...register("quantity")}
          />
        </FormField>

        <FormField label="Дата выдачи" required error={errors.occurredAt?.message}>
          <Input type="date" max={todayISODate()} disabled={isPending} {...register("occurredAt")} />
        </FormField>
      </div>

      <SelectField
        control={control}
        name="projectId"
        label="Объект"
        placeholder="На какой объект уходит материал"
        error={errors.projectId?.message}
        disabled={isPending}
        options={data.projects.map((p) => ({ value: p.id, label: p.name }))}
      />

      <FormField label="Комментарий" error={errors.comment?.message}>
        <Textarea placeholder="Необязательно" rows={2} disabled={isPending} {...register("comment")} />
      </FormField>

      <DialogFooter>
        <Button type="submit" disabled={isPending || exceedsStock}>
          {isPending ? "Сохраняем..." : "Выдать материал"}
        </Button>
      </DialogFooter>
    </form>
  );
}

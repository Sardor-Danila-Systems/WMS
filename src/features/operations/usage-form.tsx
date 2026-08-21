"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { createUsage } from "@/app/actions/movements";
import { usageSchema } from "@/lib/validation";
import { formatQuantity } from "@/lib/format";
import { FormField } from "@/shared/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { SelectField, QuantityInput, AvailableHint } from "./fields";
import { todayISODate, useActionSubmit } from "./use-operation-form";
import type { OperationRefData } from "./types";

type Values = z.input<typeof usageSchema>;

/**
 * Списание материала, израсходованного на стройке.
 * Список материалов ограничен тем, что действительно числится за бригадиром —
 * списать «из воздуха» через интерфейс невозможно.
 */
export function UsageForm({ data, onSuccess }: { data: OperationRefData; onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(usageSchema),
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
  const materialId = watch("materialId");
  const quantity = Number(watch("quantity"));

  const held = foremanId ? (data.foremanStock[foremanId] ?? []) : [];
  const position = held.find((row) => row.materialId === materialId);
  const foreman = data.foremen.find((f) => f.id === foremanId);

  // Смена бригадира обнуляет материал: у другого бригадира на руках другой набор.
  useEffect(() => {
    setValue("materialId", "");
    if (foreman?.projectId) setValue("projectId", foreman.projectId);
  }, [foremanId, foreman?.projectId, setValue]);

  const exceedsHeld = Boolean(position) && quantity > 0 && quantity > position!.quantity;

  const { submit, isPending } = useActionSubmit<Values>({
    action: createUsage,
    setError,
    successTitle: "Использование зафиксировано",
    successDescription: (values) =>
      position
        ? `Списано ${formatQuantity(Number(values.quantity), position.unit)} с остатка бригадира`
        : undefined,
    onSuccess,
  });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <SelectField
        control={control}
        name="foremanId"
        label="Бригадир"
        placeholder="Кто израсходовал материал"
        required
        error={errors.foremanId?.message}
        disabled={isPending}
        options={data.foremen.map((f) => ({ value: f.id, label: f.name, hint: f.brigade }))}
      />

      <SelectField
        control={control}
        name="materialId"
        label="Материал"
        placeholder={foremanId ? "Что израсходовано" : "Сначала выберите бригадира"}
        required
        error={errors.materialId?.message}
        disabled={isPending || !foremanId}
        emptyMessage="У бригадира нет материалов на руках"
        options={held.map((row) => ({
          value: row.materialId,
          label: row.materialName,
          hint: formatQuantity(row.quantity, row.unit),
        }))}
      >
        {position && (
          <AvailableHint available={position.quantity} unit={position.unit} label="На руках у бригадира" />
        )}
      </SelectField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Использовано"
          required
          error={errors.quantity?.message ?? (exceedsHeld ? "Больше, чем на руках у бригадира" : undefined)}
        >
          <QuantityInput
            unit={position?.unit}
            max={position?.quantity}
            invalid={Boolean(errors.quantity) || exceedsHeld}
            disabled={isPending}
            {...register("quantity")}
          />
        </FormField>

        <FormField label="Дата" required error={errors.occurredAt?.message}>
          <Input type="date" max={todayISODate()} disabled={isPending} {...register("occurredAt")} />
        </FormField>
      </div>

      <SelectField
        control={control}
        name="projectId"
        label="Объект"
        placeholder="Где израсходован материал"
        error={errors.projectId?.message}
        disabled={isPending}
        options={data.projects.map((p) => ({ value: p.id, label: p.name }))}
      />

      <FormField label="Комментарий" error={errors.comment?.message}>
        <Textarea
          placeholder="Какие работы выполнены"
          rows={2}
          disabled={isPending}
          {...register("comment")}
        />
      </FormField>

      <DialogFooter>
        <Button type="submit" disabled={isPending || exceedsHeld}>
          {isPending ? "Сохраняем..." : "Списать на объект"}
        </Button>
      </DialogFooter>
    </form>
  );
}

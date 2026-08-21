"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { createReceipt } from "@/app/actions/movements";
import { receiptSchema } from "@/lib/validation";
import { formatQuantity } from "@/lib/format";
import { FormField } from "@/shared/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { SelectField, QuantityInput } from "./fields";
import { todayISODate, useActionSubmit } from "./use-operation-form";
import type { OperationRefData } from "./types";

type Values = z.input<typeof receiptSchema>;

export function ReceiptForm({ data, onSuccess }: { data: OperationRefData; onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      materialId: "",
      quantity: "" as unknown as number,
      supplierId: "",
      vehicleNumber: "",
      occurredAt: todayISODate(),
      comment: "",
    },
  });

  const material = data.materials.find((m) => m.id === watch("materialId"));
  const { submit, isPending } = useActionSubmit<Values>({
    action: createReceipt,
    setError,
    successTitle: "Поступление зарегистрировано",
    successDescription: (values) =>
      material ? `Остаток «${material.name}» увеличен на ${formatQuantity(Number(values.quantity), material.unit)}` : undefined,
    onSuccess,
  });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <SelectField
        control={control}
        name="materialId"
        label="Материал"
        placeholder="Что поступило на склад"
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
          <p className="text-xs text-muted-foreground">
            Текущий остаток:{" "}
            <span className="font-medium tabular-nums">{formatQuantity(material.quantity, material.unit)}</span>
          </p>
        )}
      </SelectField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Количество" required error={errors.quantity?.message}>
          <QuantityInput
            unit={material?.unit}
            invalid={Boolean(errors.quantity)}
            disabled={isPending}
            {...register("quantity")}
          />
        </FormField>

        <FormField label="Дата поступления" required error={errors.occurredAt?.message}>
          <Input type="date" max={todayISODate()} disabled={isPending} {...register("occurredAt")} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          control={control}
          name="supplierId"
          label="Поставщик"
          placeholder="Кто привёз"
          error={errors.supplierId?.message}
          disabled={isPending}
          options={data.suppliers.map((s) => ({ value: s.id, label: s.name }))}
        />

        <FormField label="Номер машины" error={errors.vehicleNumber?.message}>
          <Input placeholder="А123ВС 77" disabled={isPending} {...register("vehicleNumber")} />
        </FormField>
      </div>

      <FormField label="Комментарий" error={errors.comment?.message}>
        <Textarea placeholder="Необязательно" rows={2} disabled={isPending} {...register("comment")} />
      </FormField>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Сохраняем..." : "Принять на склад"}
        </Button>
      </DialogFooter>
    </form>
  );
}

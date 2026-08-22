"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { createReceipt } from "@/app/actions/movements";
import { receiptSchema } from "@/lib/validation";
import { formatQuantity } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { translateValue } from "@/i18n";
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
  const { t, locale } = useI18n();
  const unitOf = (unit: string) => translateValue(t.units, unit);
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
    successTitle: t.operations.receipt.success,
    successDescription: (values) =>
      material
        ? t.operations.receipt.successHint(
            material.name,
            formatQuantity(Number(values.quantity), unitOf(material.unit), locale)
          )
        : undefined,
    onSuccess,
  });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <SelectField
        control={control}
        name="materialId"
        label={t.operations.material}
        placeholder={t.operations.receipt.materialPlaceholder}
        required
        error={errors.materialId?.message}
        disabled={isPending}
        options={data.materials.map((m) => ({
          value: m.id,
          label: m.name,
          hint: formatQuantity(m.quantity, unitOf(m.unit), locale),
        }))}
      >
        {material && (
          <p className="text-xs text-muted-foreground">
            {t.operations.currentStock}:{" "}
            <span className="font-medium tabular-nums">
              {formatQuantity(material.quantity, unitOf(material.unit), locale)}
            </span>
          </p>
        )}
      </SelectField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t.operations.quantity} required error={errors.quantity?.message}>
          <QuantityInput
            unit={material ? unitOf(material.unit) : undefined}
            invalid={Boolean(errors.quantity)}
            disabled={isPending}
            {...register("quantity")}
          />
        </FormField>

        <FormField label={t.operations.receipt.date} required error={errors.occurredAt?.message}>
          <Input type="date" max={todayISODate()} disabled={isPending} {...register("occurredAt")} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          control={control}
          name="supplierId"
          label={t.operations.supplier}
          placeholder={t.operations.receipt.supplierPlaceholder}
          error={errors.supplierId?.message}
          disabled={isPending}
          options={data.suppliers.map((s) => ({ value: s.id, label: s.name }))}
        />

        <FormField label={t.operations.vehicleNumber} error={errors.vehicleNumber?.message}>
          <Input placeholder={t.operations.vehiclePlaceholder} disabled={isPending} {...register("vehicleNumber")} />
        </FormField>
      </div>

      <FormField label={t.operations.comment} error={errors.comment?.message}>
        <Textarea placeholder={t.common.optional} rows={2} disabled={isPending} {...register("comment")} />
      </FormField>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? t.common.saving : t.operations.receipt.submit}
        </Button>
      </DialogFooter>
    </form>
  );
}

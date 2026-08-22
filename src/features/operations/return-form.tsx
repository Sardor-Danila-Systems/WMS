"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { createReturn } from "@/app/actions/movements";
import { returnSchema } from "@/lib/validation";
import { formatQuantity } from "@/lib/format";
import { useIntlTag, useT } from "@/i18n/client";
import { useValueTranslator } from "@/i18n/values";
import { RETURN_REASONS } from "@/constants/categories";
import { FormField } from "@/shared/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { SelectField, QuantityInput, AvailableHint } from "./fields";
import { todayISODate, useActionSubmit } from "./use-operation-form";
import type { OperationRefData } from "./types";

type Values = z.input<typeof returnSchema>;

/** Возврат неизрасходованного материала от бригадира обратно на склад. */
export function ReturnForm({ data, onSuccess }: { data: OperationRefData; onSuccess: () => void }) {
  const t = useT();
  const unitLabel = useValueTranslator("units");
  const reasonLabel = useValueTranslator("returnReasons");
  const locale = useIntlTag();
  const unitOf = (unit: string) => unitLabel(unit);
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      foremanId: "",
      materialId: "",
      quantity: "" as unknown as number,
      reason: "",
      occurredAt: todayISODate(),
      comment: "",
    },
  });

  const foremanId = watch("foremanId");
  const materialId = watch("materialId");
  const quantity = Number(watch("quantity"));

  const held = foremanId ? (data.foremanStock[foremanId] ?? []) : [];
  const position = held.find((row) => row.materialId === materialId);

  useEffect(() => {
    setValue("materialId", "");
  }, [foremanId, setValue]);

  const exceedsHeld = Boolean(position) && quantity > 0 && quantity > position!.quantity;

  const { submit, isPending } = useActionSubmit<Values>({
    action: createReturn,
    setError,
    successTitle: t("operations.return.success"),
    successDescription: (values) =>
      position
        ? t("operations.return.successHint", { qty: formatQuantity(Number(values.quantity), unitOf(position.unit), locale) })
        : undefined,
    onSuccess,
  });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <SelectField
        control={control}
        name="foremanId"
        label={t("operations.foreman")}
        placeholder={t("operations.return.foremanPlaceholder")}
        required
        error={errors.foremanId?.message}
        disabled={isPending}
        options={data.foremen.map((f) => ({ value: f.id, label: f.name, hint: f.brigade }))}
      />

      <SelectField
        control={control}
        name="materialId"
        label={t("operations.material")}
        placeholder={foremanId ? t("operations.return.materialPlaceholder") : t("operations.selectForemanFirst")}
        required
        error={errors.materialId?.message}
        disabled={isPending || !foremanId}
        emptyMessage={t("operations.noStockForeman")}
        options={held.map((row) => ({
          value: row.materialId,
          label: row.materialName,
          hint: formatQuantity(row.quantity, unitOf(row.unit), locale),
        }))}
      >
        {position && (
          <AvailableHint available={position.quantity} unit={position.unit} label={t("operations.atForemanHand")} />
        )}
      </SelectField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={t("operations.quantity")}
          required
          error={errors.quantity?.message ?? (exceedsHeld ? t("operations.exceedsForeman") : undefined)}
        >
          <QuantityInput
            unit={position ? unitOf(position.unit) : undefined}
            max={position?.quantity}
            invalid={Boolean(errors.quantity) || exceedsHeld}
            disabled={isPending}
            {...register("quantity")}
          />
        </FormField>

        <FormField label={t("operations.return.date")} required error={errors.occurredAt?.message}>
          <Input type="date" max={todayISODate()} disabled={isPending} {...register("occurredAt")} />
        </FormField>
      </div>

      <SelectField
        control={control}
        name="reason"
        label={t("operations.reason")}
        placeholder={t("operations.return.reasonPlaceholder")}
        error={errors.reason?.message}
        disabled={isPending}
        options={RETURN_REASONS.map((reason) => ({ value: reason, label: reasonLabel(reason) }))}
      />

      <FormField label={t("operations.comment")} error={errors.comment?.message}>
        <Textarea placeholder={t("common.optional")} rows={2} disabled={isPending} {...register("comment")} />
      </FormField>

      <DialogFooter>
        <Button type="submit" disabled={isPending || exceedsHeld}>
          {isPending ? t("common.saving") : t("operations.return.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}

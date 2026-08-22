"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { createIssue } from "@/app/actions/movements";
import { issueSchema } from "@/lib/validation";
import { formatQuantity } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { translateValue } from "@/i18n";
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
  const { t, locale } = useI18n();
  const unitOf = (unit: string) => translateValue(t.units, unit);
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
    successTitle: t.operations.issue.success,
    successDescription: (values) =>
      material
        ? t.operations.issue.successHint(
            formatQuantity(Number(values.quantity), unitOf(material.unit), locale)
          )
        : undefined,
    onSuccess,
  });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <SelectField
        control={control}
        name="foremanId"
        label={t.operations.foreman}
        placeholder={t.operations.issue.foremanPlaceholder}
        required
        error={errors.foremanId?.message}
        disabled={isPending}
        options={data.foremen.map((f) => ({ value: f.id, label: f.name, hint: f.brigade }))}
      />

      <SelectField
        control={control}
        name="materialId"
        label={t.operations.material}
        placeholder={t.operations.issue.materialPlaceholder}
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
          <AvailableHint available={material.quantity} unit={material.unit} label={t.operations.availableAtWarehouse} />
        )}
      </SelectField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={t.operations.quantity}
          required
          error={errors.quantity?.message ?? (exceedsStock ? t.operations.exceedsStock : undefined)}
        >
          <QuantityInput
            unit={material ? unitOf(material.unit) : undefined}
            max={material?.quantity}
            invalid={Boolean(errors.quantity) || exceedsStock}
            disabled={isPending}
            {...register("quantity")}
          />
        </FormField>

        <FormField label={t.operations.issue.date} required error={errors.occurredAt?.message}>
          <Input type="date" max={todayISODate()} disabled={isPending} {...register("occurredAt")} />
        </FormField>
      </div>

      <SelectField
        control={control}
        name="projectId"
        label={t.operations.project}
        placeholder={t.operations.issue.projectPlaceholder}
        error={errors.projectId?.message}
        disabled={isPending}
        options={data.projects.map((p) => ({ value: p.id, label: p.name }))}
      />

      <FormField label={t.operations.comment} error={errors.comment?.message}>
        <Textarea placeholder={t.common.optional} rows={2} disabled={isPending} {...register("comment")} />
      </FormField>

      <DialogFooter>
        <Button type="submit" disabled={isPending || exceedsStock}>
          {isPending ? t.common.saving : t.operations.issue.submit}
        </Button>
      </DialogFooter>
    </form>
  );
}

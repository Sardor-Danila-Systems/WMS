"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { createIssue } from "@/app/actions/movements";
import { issueSchema, lineAmount } from "@/lib/validation";
import { formatMoney, formatQuantity } from "@/lib/format";
import { useIntlTag, useT } from "@/i18n/client";
import { useValueTranslator } from "@/i18n/values";
import { FormField } from "@/shared/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  SelectField,
  QuantityInput,
  PriceInput,
  AmountPreview,
  AvailableHint,
  PaymentMethodField,
} from "./fields";
import { todayISODate, useActionSubmit } from "./use-operation-form";
import type { OperationRefData } from "./types";

type Values = z.input<typeof issueSchema>;

/** Расход: склад → блок стройки. */
export function IssueForm({ data, onSuccess }: { data: OperationRefData; onSuccess: () => void }) {
  const t = useT();
  const unitLabel = useValueTranslator("units");
  const locale = useIntlTag();
  const unitOf = (unit: string) => unitLabel(unit);

  const onlyOrganization = data.organizations.length === 1 ? data.organizations[0].id : "";

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
      blockId: "",
      materialId: "",
      quantity: "" as unknown as number,
      unitPrice: "",
      organizationId: onlyOrganization,
      invoiceNumber: "",
      vehicleNumber: "",
      paymentMethod: "",
      occurredAt: todayISODate(),
      comment: "",
    },
  });

  const blockId = watch("blockId");
  const material = data.materials.find((m) => m.id === watch("materialId"));
  const quantity = Number(watch("quantity"));
  const rawPrice = watch("unitPrice");
  const unitPrice = rawPrice === "" || rawPrice === undefined ? null : Number(rawPrice);

  // Организация берётся из карточки блока: блок закреплён за организацией,
  // и повторный выбор только замедляет оформление.
  const block = data.blocks.find((b) => b.id === blockId);
  useEffect(() => {
    if (block?.organizationId) setValue("organizationId", block.organizationId);
  }, [block?.organizationId, setValue]);

  // Расход идёт по текущей цене материала — её можно поправить вручную.
  useEffect(() => {
    if (material && material.price > 0) setValue("unitPrice", material.price);
  }, [material, setValue]);

  const exceedsStock = Boolean(material) && quantity > 0 && quantity > material!.quantity;

  const { submit, isPending } = useActionSubmit<Values>({
    action: createIssue,
    setError,
    successTitle: t("operations.issue.success"),
    successDescription: (values) =>
      material
        ? t("operations.issue.successHint", {
            qty: formatQuantity(Number(values.quantity), unitOf(material.unit), locale),
            amount: `${formatMoney(
              lineAmount(Number(values.quantity), unitPrice ?? material.price),
              locale
            )} ${t("money.currency")}`,
          })
        : undefined,
    onSuccess,
  });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          control={control}
          name="blockId"
          label={t("operations.block")}
          placeholder={t("operations.issue.blockPlaceholder")}
          required
          error={errors.blockId?.message}
          disabled={isPending}
          options={data.blocks.map((b) => ({ value: b.id, label: b.name, hint: b.description }))}
        />

        <FormField label={t("operations.issue.date")} required error={errors.occurredAt?.message}>
          <Input type="date" max={todayISODate()} disabled={isPending} {...register("occurredAt")} />
        </FormField>
      </div>

      <SelectField
        control={control}
        name="materialId"
        label={t("operations.material")}
        placeholder={t("operations.issue.materialPlaceholder")}
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
          <AvailableHint
            available={material.quantity}
            unit={unitOf(material.unit)}
            label={t("operations.availableAtWarehouse")}
          />
        )}
      </SelectField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={t("operations.quantity")}
          required
          error={errors.quantity?.message ?? (exceedsStock ? t("operations.exceedsStock") : undefined)}
        >
          <QuantityInput
            unit={material ? unitOf(material.unit) : undefined}
            max={material?.quantity}
            invalid={Boolean(errors.quantity) || exceedsStock}
            disabled={isPending}
            {...register("quantity")}
          />
        </FormField>

        <FormField
          label={material ? t("money.pricePerUnit", { unit: unitOf(material.unit) }) : t("money.unitPrice")}
          error={errors.unitPrice?.message}
        >
          <PriceInput
            invalid={Boolean(errors.unitPrice)}
            disabled={isPending}
            {...register("unitPrice")}
          />
        </FormField>
      </div>

      <AmountPreview
        quantity={quantity}
        unitPrice={unitPrice}
        fallbackPrice={material?.price ?? 0}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          control={control}
          name="organizationId"
          label={t("operations.organization")}
          placeholder={t("operations.organizationPlaceholder")}
          error={errors.organizationId?.message}
          disabled={isPending}
          options={data.organizations.map((o) => ({ value: o.id, label: o.name }))}
        />

        <FormField label={t("operations.invoiceNumber")} error={errors.invoiceNumber?.message}>
          <Input
            placeholder={t("operations.invoicePlaceholder")}
            disabled={isPending}
            {...register("invoiceNumber")}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("operations.vehicleNumber")} error={errors.vehicleNumber?.message}>
          <Input
            placeholder={t("operations.vehiclePlaceholder")}
            disabled={isPending}
            {...register("vehicleNumber")}
          />
        </FormField>

        <PaymentMethodField
          control={control}
          name="paymentMethod"
          error={errors.paymentMethod?.message}
          disabled={isPending}
        />
      </div>

      <FormField label={t("operations.comment")} error={errors.comment?.message}>
        <Textarea placeholder={t("common.optional")} rows={2} disabled={isPending} {...register("comment")} />
      </FormField>

      <DialogFooter>
        <Button type="submit" disabled={isPending || exceedsStock}>
          {isPending ? t("common.saving") : t("operations.issue.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import type { z } from "zod";

import { createReceipt } from "@/app/actions/movements";
import { receiptSchema, lineAmount } from "@/lib/validation";
import { formatMoney, formatQuantity } from "@/lib/format";
import { useIntlTag, useT } from "@/i18n/client";
import { useValidationResolver } from "@/i18n/resolver";
import { useValueTranslator } from "@/i18n/values";
import { FormField } from "@/shared/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { MaterialFormDialog } from "@/features/materials/material-form-dialog";
import { SupplierFormDialog } from "@/features/suppliers/supplier-form-dialog";
import type { Material, Supplier } from "@/types";
import {
  SelectField,
  QuantityInput,
  PriceInput,
  AmountPreview,
  PaymentMethodField,
} from "./fields";
import { todayISODate, useActionSubmit } from "./use-operation-form";
import type { OperationRefData } from "./types";

type Values = z.input<typeof receiptSchema>;

/**
 * Справочники приезжают с сервера, а заведённые прямо здесь записи живут
 * в состоянии формы: ждать перезагрузки страницы, чтобы подставить в поле
 * только что созданный материал, кладовщику незачем. Совпадения по id
 * отбрасываем — после обновления страницы запись придёт и с сервера.
 */
function mergeCreated<T extends { id: string; name: string }>(
  fromServer: T[],
  created: T[],
  locale: string
): T[] {
  const known = new Set(fromServer.map((item) => item.id));
  return [...fromServer, ...created.filter((item) => !known.has(item.id))].sort((a, b) =>
    a.name.localeCompare(b.name, locale)
  );
}

/** Приход: поставщик → склад. Форма повторяет поля бумажной фактуры. */
export function ReceiptForm({ data, onSuccess }: { data: OperationRefData; onSuccess: () => void }) {
  const t = useT();
  const unitLabel = useValueTranslator("units");
  const locale = useIntlTag();
  const unitOf = (unit: string) => unitLabel(unit);

  // Организация обычно одна — подставляем её, чтобы не выбирать каждый раз.
  const onlyOrganization = data.organizations.length === 1 ? data.organizations[0].id : "";

  const [createdMaterials, setCreatedMaterials] = useState<Material[]>([]);
  const [createdSuppliers, setCreatedSuppliers] = useState<Supplier[]>([]);

  const materials = useMemo(
    () => mergeCreated(data.materials, createdMaterials, locale),
    [data.materials, createdMaterials, locale]
  );
  const suppliers = useMemo(
    () => mergeCreated(data.suppliers, createdSuppliers, locale),
    [data.suppliers, createdSuppliers, locale]
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: useValidationResolver<Values>(receiptSchema),
    defaultValues: {
      materialId: "",
      quantity: "" as unknown as number,
      unitPrice: "",
      supplierId: "",
      organizationId: onlyOrganization,
      invoiceNumber: "",
      vehicleNumber: "",
      paymentMethod: "",
      occurredAt: todayISODate(),
      comment: "",
    },
  });

  const materialId = watch("materialId");
  const material = materials.find((m) => m.id === materialId);
  const quantity = Number(watch("quantity"));
  const rawPrice = watch("unitPrice");
  const unitPrice = rawPrice === "" || rawPrice === undefined ? null : Number(rawPrice);

  // Цена подставляется из карточки материала — её остаётся только поправить,
  // если поставщик привёз по другой цене.
  useEffect(() => {
    if (material && material.price > 0) setValue("unitPrice", material.price);
  }, [material, setValue]);

  const { submit, isPending } = useActionSubmit<Values>({
    action: createReceipt,
    setError,
    successTitle: t("operations.receipt.success"),
    successDescription: (values) =>
      material
        ? t("operations.receipt.successHint", {
            name: material.name,
            qty: formatQuantity(Number(values.quantity), unitOf(material.unit), locale),
            amount: `${formatMoney(
              lineAmount(Number(values.quantity), unitPrice ?? material.price),
              locale
            )} ${t("money.currency")}`,
          })
        : undefined,
    onSuccess,
  });

  /** Кнопка «+» рядом с подписью поля. type=button — иначе отправит накладную. */
  const addButton = (label: string) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-my-1 h-6 gap-1 px-1.5 text-[12.5px] font-medium text-primary"
    >
      <Plus className="h-3 w-3" />
      {label}
    </Button>
  );

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("operations.receipt.date")} required error={errors.occurredAt?.message}>
          <Input type="date" max={todayISODate()} disabled={isPending} {...register("occurredAt")} />
        </FormField>

        <FormField label={t("operations.invoiceNumber")} error={errors.invoiceNumber?.message}>
          <Input
            placeholder={t("operations.invoicePlaceholder")}
            disabled={isPending}
            {...register("invoiceNumber")}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          control={control}
          name="supplierId"
          label={t("operations.supplier")}
          placeholder={t("operations.receipt.supplierPlaceholder")}
          error={errors.supplierId?.message}
          disabled={isPending}
          options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          action={
            <SupplierFormDialog
              trigger={addButton(t("suppliers.addShort"))}
              onCreated={(created) => {
                setCreatedSuppliers((prev) => [...prev, created]);
                setValue("supplierId", created.id);
              }}
            />
          }
        />

        <SelectField
          control={control}
          name="organizationId"
          label={t("operations.organization")}
          placeholder={t("operations.organizationPlaceholder")}
          error={errors.organizationId?.message}
          disabled={isPending}
          options={data.organizations.map((o) => ({ value: o.id, label: o.name }))}
        />
      </div>

      <SelectField
        control={control}
        name="materialId"
        label={t("operations.material")}
        placeholder={t("operations.receipt.materialPlaceholder")}
        required
        error={errors.materialId?.message}
        disabled={isPending}
        options={materials.map((m) => ({
          value: m.id,
          label: m.name,
          hint: formatQuantity(m.quantity, unitOf(m.unit), locale),
        }))}
        action={
          <MaterialFormDialog
            hideInitialStock
            trigger={addButton(t("materials.addShort"))}
            onCreated={(created) => {
              setCreatedMaterials((prev) => [...prev, created]);
              setValue("materialId", created.id);
            }}
          />
        }
      >
        {material && (
          <p className="text-[13px] text-muted-foreground">
            {t("operations.currentStock")}:{" "}
            <span className="font-medium tabular-nums">
              {formatQuantity(material.quantity, unitOf(material.unit), locale)}
            </span>
          </p>
        )}
      </SelectField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("operations.quantity")} required error={errors.quantity?.message}>
          <QuantityInput
            unit={material ? unitOf(material.unit) : undefined}
            invalid={Boolean(errors.quantity)}
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
        <Button type="submit" disabled={isPending}>
          {isPending ? t("common.saving") : t("operations.receipt.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}

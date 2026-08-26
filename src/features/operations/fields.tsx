"use client";

import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { Controller } from "react-hook-form";

import { FormField } from "@/shared/components/form-field";
import { useIntlTag, useT } from "@/i18n/client";
import { formatMoney, formatNumber } from "@/lib/format";
import { lineAmount } from "@/lib/validation";
import { PAYMENT_METHODS } from "@/constants/categories";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Выпадающий список, подключённый к react-hook-form.
 * Base UI возвращает null при снятии выбора — приводим к пустой строке,
 * чтобы zod-схема видела «не выбрано», а не null.
 */
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  required,
  error,
  disabled,
  emptyMessage,
  children,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder: string;
  options: SelectOption[];
  required?: boolean;
  error?: string;
  disabled?: boolean;
  emptyMessage?: string;
  children?: ReactNode;
}) {
  const t = useT();
  const noOptions = emptyMessage ?? t("operations.noOptions");

  // Base UI показывает в поле «сырое» значение, если не передать карту
  // «значение → подпись». Без неё в поле выводился бы идентификатор материала.
  const itemLabels = Object.fromEntries(options.map((option) => [option.value, option.label]));

  return (
    <FormField label={label} required={required} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value ?? ""}
            onValueChange={(value) => field.onChange(value ?? "")}
            disabled={disabled || options.length === 0}
            items={itemLabels}
          >
            <SelectTrigger className="w-full" aria-invalid={Boolean(error)}>
              <SelectValue placeholder={options.length === 0 ? noOptions : placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="truncate">{option.label}</span>
                    {option.hint && (
                      <span className="shrink-0 text-[13px] text-muted-foreground">{option.hint}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {children}
    </FormField>
  );
}

/** Поле количества с подписью единицы измерения внутри поля. */
export function QuantityInput({
  unit,
  disabled,
  invalid,
  ...props
}: React.ComponentProps<typeof Input> & { unit?: string; invalid?: boolean }) {
  return (
    <div className="relative">
      <Input
        type="number"
        step="any"
        min="0"
        inputMode="decimal"
        placeholder="0"
        className={unit ? "pr-14" : undefined}
        aria-invalid={invalid}
        disabled={disabled}
        {...props}
      />
      {unit && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">
          {unit}
        </span>
      )}
    </div>
  );
}

/** Поле цены — то же, что количество, но с обозначением валюты. */
export function PriceInput({
  disabled,
  invalid,
  ...props
}: React.ComponentProps<typeof Input> & { invalid?: boolean }) {
  const t = useT();
  return (
    <div className="relative">
      <Input
        type="number"
        step="any"
        min="0"
        inputMode="decimal"
        placeholder="0"
        className="pr-16"
        aria-invalid={invalid}
        disabled={disabled}
        {...props}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">
        {t("money.currency")}
      </span>
    </div>
  );
}

/**
 * Итог строки накладной: количество × цена.
 * Считается прямо в форме, чтобы кладовщик видел сумму до сохранения —
 * ровно так же, как он считает её в бумажной накладной. Тот же расчёт
 * повторяется на сервере: показанная сумма и записанная в журнал совпадают.
 */
export function AmountPreview({
  quantity,
  unitPrice,
  fallbackPrice = 0,
}: {
  quantity: number;
  unitPrice: number | null;
  fallbackPrice?: number;
}) {
  const t = useT();
  const locale = useIntlTag();

  const price = unitPrice ?? fallbackPrice;
  const hasQuantity = Number.isFinite(quantity) && quantity > 0;
  const hasPrice = Number.isFinite(price) && price > 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{t("money.amount")}</div>
        <div className="truncate text-[12.5px] text-muted-foreground">
          {hasQuantity && hasPrice
            ? `${formatNumber(quantity, locale)} × ${formatMoney(price, locale)}`
            : t("money.autoCalculated")}
        </div>
      </div>
      <div className="shrink-0 text-right text-[15px] font-semibold tabular-nums">
        {hasQuantity && hasPrice ? (
          <>
            {formatMoney(lineAmount(quantity, price), locale)}{" "}
            <span className="text-[12.5px] font-normal text-muted-foreground">
              {t("money.currency")}
            </span>
          </>
        ) : (
          <span className="text-[13px] font-normal text-muted-foreground">{t("common.dash")}</span>
        )}
      </div>
    </div>
  );
}

/** Способ оплаты: наличные или перечисление. */
export function PaymentMethodField<T extends FieldValues>({
  control,
  name,
  error,
  disabled,
}: {
  control: Control<T>;
  name: Path<T>;
  error?: string;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <SelectField
      control={control}
      name={name}
      label={t("operations.paymentMethod")}
      placeholder={t("operations.paymentPlaceholder")}
      error={error}
      disabled={disabled}
      options={PAYMENT_METHODS.map((method) => ({
        value: method,
        label: t(`paymentMethods.${method}`),
      }))}
    />
  );
}

/** Подсказка о доступном остатке под полем выбора материала. */
export function AvailableHint({
  available,
  unit,
  label,
}: {
  available: number;
  unit: string;
  label: string;
}) {
  const locale = useIntlTag();
  const isEmpty = available <= 0;
  return (
    <p className={isEmpty ? "text-[13px] text-destructive" : "text-[13px] text-muted-foreground"}>
      {label}:{" "}
      <span className="font-medium tabular-nums">
        {formatNumber(available, locale)} {unit}
      </span>
    </p>
  );
}

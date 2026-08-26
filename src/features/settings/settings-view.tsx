"use client";

import { useState } from "react";
import { toast } from "sonner";

import { saveSettings } from "@/app/actions/catalog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/shared/components/form-field";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { CATEGORIES, PAYMENT_METHODS, UNITS } from "@/constants/categories";
import { useT } from "@/i18n/client";
import { useValueTranslator } from "@/i18n/values";
import type { Role } from "@/types";

const ROLE_ORDER: Role[] = ["ADMIN", "WAREHOUSE_WORKER"];

export function SettingsView({
  companyName: initialCompanyName,
  warehouseAddress: initialAddress,
  currency: initialCurrency,
}: {
  companyName: string;
  warehouseAddress: string;
  currency: string;
}) {
  const t = useT();
  const unitLabel = useValueTranslator("units");
  const categoryLabel = useValueTranslator("categories");
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [warehouseAddress, setWarehouseAddress] = useState(initialAddress);
  const [currency, setCurrency] = useState(initialCurrency);
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append("companyName", companyName);
      formData.append("warehouseAddress", warehouseAddress);
      formData.append("currency", currency);

      const result = await saveSettings(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("settings.saved"));
    } catch {
      toast.error(t("common.serverUnavailable"));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-[14.5px] font-semibold">{t("settings.languageTitle")}</CardTitle>
          <CardDescription className="text-[13px]">{t("settings.languageHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitch />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14.5px] font-semibold">{t("settings.orgTitle")}</CardTitle>
          <CardDescription className="text-[13px]">{t("settings.orgHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t("settings.companyName")}>
              <Input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                disabled={isPending}
              />
            </FormField>
            <FormField label={t("settings.warehouseAddress")}>
              <Input
                value={warehouseAddress}
                onChange={(event) => setWarehouseAddress(event.target.value)}
                disabled={isPending}
              />
            </FormField>
          </div>
          <FormField label={t("settings.currency")} hint={t("settings.currencyHint")}>
            <Input
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              disabled={isPending}
              className="sm:max-w-[200px]"
            />
          </FormField>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14.5px] font-semibold">{t("roles.accessTitle")}</CardTitle>
          <CardDescription className="text-[13px]">{t("roles.accessNote")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {ROLE_ORDER.map((role) => (
            <div key={role} className="rounded-md border border-border p-3">
              <div className="text-[14.5px] font-medium">{t(`roles.${role}`)}</div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                {t(`roles.descriptions.${role}`)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-[14.5px] font-semibold">{t("settings.categoriesTitle")}</CardTitle>
            <CardDescription className="text-[13px]">{t("settings.categoriesHint")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((category) => (
              <Badge key={category} variant="outline" className="font-normal">
                {categoryLabel(category)}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[14.5px] font-semibold">{t("settings.unitsTitle")}</CardTitle>
            <CardDescription className="text-[13px]">{t("settings.unitsHint")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {UNITS.map((unit) => (
              <Badge key={unit} variant="outline" className="font-normal">
                {unitLabel(unit)}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[14.5px] font-semibold">{t("settings.paymentTitle")}</CardTitle>
            <CardDescription className="text-[13px]">{t("settings.paymentHint")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {PAYMENT_METHODS.map((method) => (
              <Badge key={method} variant="outline" className="font-normal">
                {t(`paymentMethods.${method}`)}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div className="min-w-0">
              <CardTitle className="text-[14.5px] font-semibold">
                {t("settings.integrationTitle")}
              </CardTitle>
              <CardDescription className="text-[13px]">
                {t("settings.integrationHint")}
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
              {t("settings.integrationStatus")}
            </Badge>
          </CardHeader>
          <CardContent className="hidden" />
        </Card>
      </div>
    </div>
  );
}

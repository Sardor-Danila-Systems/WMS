"use client";

import { useState } from "react";
import { toast } from "sonner";

import { saveSettings } from "@/app/actions/catalog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/shared/components/form-field";
import { CATEGORIES, UNITS } from "@/constants/categories";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_OPTIONS } from "@/constants/roles";

export function SettingsView({
  companyName: initialCompanyName,
  warehouseAddress: initialAddress,
}: {
  companyName: string;
  warehouseAddress: string;
}) {
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [warehouseAddress, setWarehouseAddress] = useState(initialAddress);
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append("companyName", companyName);
      formData.append("warehouseAddress", warehouseAddress);

      const result = await saveSettings(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Настройки сохранены");
    } catch {
      toast.error("Сервер недоступен. Попробуйте ещё раз.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Организация</CardTitle>
          <CardDescription>Название компании отображается в боковом меню</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Название компании">
              <Input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                disabled={isPending}
              />
            </FormField>
            <FormField label="Адрес склада">
              <Input
                value={warehouseAddress}
                onChange={(event) => setWarehouseAddress(event.target.value)}
                disabled={isPending}
              />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Сохраняем..." : "Сохранить"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Роли и доступ</CardTitle>
          <CardDescription>Права назначаются сотруднику в разделе «Сотрудники»</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ROLE_OPTIONS.map((role) => (
            <div key={role} className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium">{ROLE_LABELS[role]}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Категории материалов</CardTitle>
            <CardDescription>Доступны при заведении нового материала</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((category) => (
              <Badge key={category} variant="outline">
                {category}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Единицы измерения</CardTitle>
            <CardDescription>
              Единицу нельзя изменить после первой операции по материалу
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {UNITS.map((unit) => (
              <Badge key={unit} variant="outline">
                {unit}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

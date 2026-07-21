"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/shared/components/form-field";
import { CATEGORIES, UNITS } from "@/constants/categories";

export function SettingsView() {
  const [companyName, setCompanyName] = useState("ООО «СтройХолдинг»");
  const [warehouseAddress, setWarehouseAddress] = useState("г. Москва, Складской проезд, д. 12");
  const [lowStockThreshold, setLowStockThreshold] = useState("150");

  function handleSave() {
    toast.success("Настройки сохранены", {
      description: "В демо-версии изменения не сохраняются на сервере",
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Общие настройки</CardTitle>
          <CardDescription>Основная информация об организации</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Название компании">
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </FormField>
            <FormField label="Адрес склада">
              <Input value={warehouseAddress} onChange={(e) => setWarehouseAddress(e.target.value)} />
            </FormField>
          </div>
          <FormField
            label="Порог предупреждения о низком остатке (%)"
            className="max-w-xs"
          >
            <Input
              type="number"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Категории материалов</CardTitle>
          <CardDescription>Используются при добавлении новых материалов</CardDescription>
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
          <CardDescription>Доступны при регистрации операций</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {UNITS.map((unit) => (
            <Badge key={unit} variant="outline">
              {unit}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Сохранить изменения</Button>
      </div>
    </div>
  );
}

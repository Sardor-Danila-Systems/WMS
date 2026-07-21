"use client";

import { FileBarChart, HardHat, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExportMenu } from "@/shared/components/export-menu";
import { useWarehouseStore } from "@/store/warehouse-store";
import { getForemanStats } from "@/store/selectors";
import { exportToCsv, exportToXlsx } from "@/lib/export";
import { OPERATION_META } from "@/constants/colors";
import { formatDateTime } from "@/lib/format";
import type { OperationType } from "@/types";

export function ExportCards() {
  const materials = useWarehouseStore((s) => s.materials);
  const operations = useWarehouseStore((s) => s.operations);
  const foremen = useWarehouseStore((s) => s.foremen);
  const workers = useWarehouseStore((s) => s.workers);

  const workerName = (id: string) => workers.find((w) => w.id === id)?.name ?? "—";

  const cards = [
    {
      icon: Package,
      title: "Отчёт по материалам",
      description: "Полный список материалов с текущими остатками и нормами",
      csv: () =>
        exportToCsv(
          "otchet-materialy.csv",
          ["Название", "Категория", "Ед. изм.", "Остаток", "Мин. остаток", "Последнее поступление"],
          materials.map((m) => [
            m.name,
            m.category,
            m.unit,
            m.quantity,
            m.minStock,
            m.lastReceiptDate ? formatDateTime(m.lastReceiptDate) : "—",
          ])
        ),
      xlsx: () =>
        exportToXlsx(
          "otchet-materialy.xlsx",
          "Материалы",
          ["Название", "Категория", "Ед. изм.", "Остаток", "Мин. остаток", "Последнее поступление"],
          materials.map((m) => [
            m.name,
            m.category,
            m.unit,
            m.quantity,
            m.minStock,
            m.lastReceiptDate ? formatDateTime(m.lastReceiptDate) : "—",
          ])
        ),
    },
    {
      icon: FileBarChart,
      title: "Отчёт по операциям",
      description: "Все поступления, выдачи и возвраты за всё время",
      csv: () =>
        exportToCsv(
          "otchet-operatsii.csv",
          ["Тип", "Дата", "Материал", "Количество", "Ед.изм.", "Контрагент", "Работник"],
          operations.map((op) => [
            OPERATION_META[op.type as OperationType].label,
            formatDateTime(op.date),
            op.materialName,
            op.quantity,
            op.unit,
            op.counterpartyName,
            workerName(op.workerId),
          ])
        ),
      xlsx: () =>
        exportToXlsx(
          "otchet-operatsii.xlsx",
          "Операции",
          ["Тип", "Дата", "Материал", "Количество", "Ед.изм.", "Контрагент", "Работник"],
          operations.map((op) => [
            OPERATION_META[op.type as OperationType].label,
            formatDateTime(op.date),
            op.materialName,
            op.quantity,
            op.unit,
            op.counterpartyName,
            workerName(op.workerId),
          ])
        ),
    },
    {
      icon: HardHat,
      title: "Отчёт по бригадирам",
      description: "Сводка по количеству полученных и возвращённых материалов",
      csv: () => {
        const stats = getForemanStats(operations);
        exportToCsv(
          "otchet-brigadiry.csv",
          ["Бригадир", "Бригада", "Получено операций", "Возвращено операций"],
          foremen.map((f) => [
            f.name,
            f.brigade,
            stats.get(f.id)?.issuedOperations ?? 0,
            stats.get(f.id)?.returnedOperations ?? 0,
          ])
        );
      },
      xlsx: () => {
        const stats = getForemanStats(operations);
        exportToXlsx(
          "otchet-brigadiry.xlsx",
          "Бригадиры",
          ["Бригадир", "Бригада", "Получено операций", "Возвращено операций"],
          foremen.map((f) => [
            f.name,
            f.brigade,
            stats.get(f.id)?.issuedOperations ?? 0,
            stats.get(f.id)?.returnedOperations ?? 0,
          ])
        );
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader>
            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <card.icon className="h-4.5 w-4.5" />
            </div>
            <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
            <CardDescription className="text-xs">{card.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ExportMenu onExportCsv={card.csv} onExportXlsx={card.xlsx} label="Выгрузить" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

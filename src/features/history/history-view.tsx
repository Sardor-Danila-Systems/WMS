"use client";

import { useMemo, useState } from "react";
import { useWarehouseStore } from "@/store/warehouse-store";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { OperationTypeBadge } from "@/shared/components/status-badge";
import { ExportMenu } from "@/shared/components/export-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { exportToCsv, exportToXlsx } from "@/lib/export";
import { useLoadingDelay } from "@/hooks/use-loading-delay";
import type { Operation, OperationType } from "@/types";
import { OPERATION_META } from "@/constants/colors";

const PERIOD_OPTIONS = [
  { value: "all", label: "Всё время" },
  { value: "7", label: "Последние 7 дней" },
  { value: "30", label: "Последние 30 дней" },
  { value: "today", label: "Сегодня" },
] as const;

export function HistoryView() {
  const operations = useWarehouseStore((s) => s.operations);
  const materials = useWarehouseStore((s) => s.materials);
  const workers = useWarehouseStore((s) => s.workers);
  const isLoading = useLoadingDelay(400);

  const [type, setType] = useState<string>("all");
  const [materialId, setMaterialId] = useState<string>("all");
  const [workerId, setWorkerId] = useState<string>("all");
  const [period, setPeriod] = useState<string>("all");

  const workerName = (id: string) => workers.find((w) => w.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    // Время фильтрации намеренно читается при каждом пересчёте — фильтр «последние N дней» должен сдвигаться вместе с текущим моментом.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    return operations.filter((op) => {
      if (type !== "all" && op.type !== type) return false;
      if (materialId !== "all" && op.materialId !== materialId) return false;
      if (workerId !== "all" && op.workerId !== workerId) return false;
      if (period !== "all") {
        const opTime = new Date(op.date).getTime();
        if (period === "today") {
          const d = new Date(op.date);
          const today = new Date();
          if (
            d.getFullYear() !== today.getFullYear() ||
            d.getMonth() !== today.getMonth() ||
            d.getDate() !== today.getDate()
          )
            return false;
        } else {
          const days = Number(period);
          if (now - opTime > days * 86400000) return false;
        }
      }
      return true;
    });
  }, [operations, type, materialId, workerId, period]);

  const columns: DataTableColumn<Operation>[] = [
    {
      id: "type",
      header: "Тип",
      accessor: (op) => <OperationTypeBadge type={op.type} />,
      sortValue: (op) => op.type,
    },
    {
      id: "date",
      header: "Дата",
      accessor: (op) => formatDateTime(op.date),
      sortValue: (op) => new Date(op.date).getTime(),
    },
    {
      id: "material",
      header: "Материал",
      accessor: (op) => <span className="font-medium">{op.materialName}</span>,
      sortValue: (op) => op.materialName,
    },
    {
      id: "quantity",
      header: "Количество",
      accessor: (op) => <span className="tabular-nums">{formatQuantity(op.quantity, op.unit)}</span>,
      sortValue: (op) => op.quantity,
    },
    {
      id: "counterparty",
      header: "Контрагент",
      accessor: (op) => op.counterpartyName,
      sortValue: (op) => op.counterpartyName,
    },
    {
      id: "worker",
      header: "Работник склада",
      accessor: (op) => workerName(op.workerId),
    },
    {
      id: "comment",
      header: "Комментарий",
      accessor: (op) => <span className="text-muted-foreground">{op.comment || op.reason || "—"}</span>,
    },
  ];

  function handleExportCsv() {
    exportToCsv(
      "istoriya-operatsiy.csv",
      ["Тип", "Дата", "Материал", "Количество", "Ед.изм.", "Контрагент", "Работник", "Комментарий"],
      filtered.map((op) => [
        OPERATION_META[op.type as OperationType].label,
        formatDateTime(op.date),
        op.materialName,
        op.quantity,
        op.unit,
        op.counterpartyName,
        workerName(op.workerId),
        op.comment || op.reason || "",
      ])
    );
  }

  function handleExportXlsx() {
    exportToXlsx(
      "istoriya-operatsiy.xlsx",
      "История операций",
      ["Тип", "Дата", "Материал", "Количество", "Ед.изм.", "Контрагент", "Работник", "Комментарий"],
      filtered.map((op) => [
        OPERATION_META[op.type as OperationType].label,
        formatDateTime(op.date),
        op.materialName,
        op.quantity,
        op.unit,
        op.counterpartyName,
        workerName(op.workerId),
        op.comment || op.reason || "",
      ])
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={type} onValueChange={(v) => setType(v ?? "all")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Тип операции" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="receipt">Поступление</SelectItem>
              <SelectItem value="issue">Выдача</SelectItem>
              <SelectItem value="return">Возврат</SelectItem>
            </SelectContent>
          </Select>

          <Select value={materialId} onValueChange={(v) => setMaterialId(v ?? "all")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Материал" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все материалы</SelectItem>
              {materials.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={workerId} onValueChange={(v) => setWorkerId(v ?? "all")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Работник" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все работники</SelectItem>
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={(v) => setPeriod(v ?? "all")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ExportMenu onExportCsv={handleExportCsv} onExportXlsx={handleExportXlsx} />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(op) => op.id}
        isLoading={isLoading}
        pageSize={15}
        emptyMessage="Операции не найдены"
      />
    </div>
  );
}

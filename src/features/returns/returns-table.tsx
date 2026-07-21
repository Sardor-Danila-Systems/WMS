"use client";

import { useMemo } from "react";
import { useWarehouseStore } from "@/store/warehouse-store";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { useLoadingDelay } from "@/hooks/use-loading-delay";
import type { Operation } from "@/types";

export function ReturnsTable() {
  const operations = useWarehouseStore((s) => s.operations);
  const workers = useWarehouseStore((s) => s.workers);
  const isLoading = useLoadingDelay(400);

  const returns = useMemo(() => operations.filter((op) => op.type === "return"), [operations]);
  const workerName = (id: string) => workers.find((w) => w.id === id)?.name ?? "—";

  const columns: DataTableColumn<Operation>[] = [
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
      id: "foreman",
      header: "Бригадир",
      accessor: (op) => op.counterpartyName,
      sortValue: (op) => op.counterpartyName,
    },
    {
      id: "reason",
      header: "Причина",
      accessor: (op) => <span className="text-muted-foreground">{op.reason}</span>,
    },
    {
      id: "worker",
      header: "Работник",
      accessor: (op) => workerName(op.workerId),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={returns}
      rowKey={(op) => op.id}
      isLoading={isLoading}
      pageSize={10}
      emptyMessage="Возвратов пока не было"
    />
  );
}

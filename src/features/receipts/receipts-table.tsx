"use client";

import { useMemo } from "react";
import { useWarehouseStore } from "@/store/warehouse-store";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { useLoadingDelay } from "@/hooks/use-loading-delay";
import type { Operation } from "@/types";

export function ReceiptsTable() {
  const operations = useWarehouseStore((s) => s.operations);
  const workers = useWarehouseStore((s) => s.workers);
  const isLoading = useLoadingDelay(400);

  const receipts = useMemo(() => operations.filter((op) => op.type === "receipt"), [operations]);
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
      id: "supplier",
      header: "Поставщик",
      accessor: (op) => op.counterpartyName,
      sortValue: (op) => op.counterpartyName,
    },
    {
      id: "vehicle",
      header: "№ машины",
      accessor: (op) => <span className="tabular-nums text-muted-foreground">{op.vehicleNumber}</span>,
    },
    {
      id: "worker",
      header: "Работник",
      accessor: (op) => workerName(op.workerId),
    },
    {
      id: "comment",
      header: "Комментарий",
      accessor: (op) => <span className="text-muted-foreground">{op.comment || "—"}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={receipts}
      rowKey={(op) => op.id}
      isLoading={isLoading}
      pageSize={10}
      emptyMessage="Поступлений пока не было"
    />
  );
}

"use client";

import { useMemo } from "react";
import { useWarehouseStore } from "@/store/warehouse-store";
import { getWorkerOperationCounts } from "@/store/selectors";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLoadingDelay } from "@/hooks/use-loading-delay";
import type { Worker } from "@/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function WorkersTable() {
  const workers = useWarehouseStore((s) => s.workers);
  const operations = useWarehouseStore((s) => s.operations);
  const isLoading = useLoadingDelay(400);

  const counts = useMemo(() => getWorkerOperationCounts(operations), [operations]);

  const columns: DataTableColumn<Worker>[] = [
    {
      id: "name",
      header: "Имя",
      accessor: (w) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-muted text-[10px]">{initials(w.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{w.name}</span>
        </div>
      ),
      sortValue: (w) => w.name,
    },
    {
      id: "phone",
      header: "Телефон",
      accessor: (w) => <span className="tabular-nums text-muted-foreground">{w.phone}</span>,
    },
    {
      id: "position",
      header: "Должность",
      accessor: (w) => w.position,
      sortValue: (w) => w.position,
    },
    {
      id: "operations",
      header: "Операций выполнено",
      accessor: (w) => <span className="font-medium tabular-nums">{counts.get(w.id) ?? 0}</span>,
      sortValue: (w) => counts.get(w.id) ?? 0,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={workers}
      rowKey={(w) => w.id}
      isLoading={isLoading}
      pageSize={12}
      emptyMessage="Работники не найдены"
    />
  );
}

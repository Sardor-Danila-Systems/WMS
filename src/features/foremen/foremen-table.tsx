"use client";

import { useMemo } from "react";
import { useWarehouseStore } from "@/store/warehouse-store";
import { getForemanStats } from "@/store/selectors";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLoadingDelay } from "@/hooks/use-loading-delay";
import type { Foreman } from "@/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ForemenTable() {
  const foremen = useWarehouseStore((s) => s.foremen);
  const operations = useWarehouseStore((s) => s.operations);
  const isLoading = useLoadingDelay(400);

  const stats = useMemo(() => getForemanStats(operations), [operations]);

  const columns: DataTableColumn<Foreman>[] = [
    {
      id: "name",
      header: "Имя",
      accessor: (f) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-muted text-[10px]">{initials(f.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{f.name}</span>
        </div>
      ),
      sortValue: (f) => f.name,
    },
    {
      id: "brigade",
      header: "Бригада",
      accessor: (f) => f.brigade,
      sortValue: (f) => f.brigade,
    },
    {
      id: "phone",
      header: "Телефон",
      accessor: (f) => <span className="tabular-nums text-muted-foreground">{f.phone}</span>,
    },
    {
      id: "issued",
      header: "Получено операций",
      accessor: (f) => (
        <span className="font-medium tabular-nums">{stats.get(f.id)?.issuedOperations ?? 0}</span>
      ),
      sortValue: (f) => stats.get(f.id)?.issuedOperations ?? 0,
    },
    {
      id: "returned",
      header: "Возвращено операций",
      accessor: (f) => (
        <span className="font-medium tabular-nums">{stats.get(f.id)?.returnedOperations ?? 0}</span>
      ),
      sortValue: (f) => stats.get(f.id)?.returnedOperations ?? 0,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={foremen}
      rowKey={(f) => f.id}
      isLoading={isLoading}
      pageSize={12}
      emptyMessage="Бригадиры не найдены"
    />
  );
}

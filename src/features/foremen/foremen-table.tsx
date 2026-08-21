"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { declOf, formatDate } from "@/lib/format";
import type { Foreman } from "@/types";
import type { ForemanSummary } from "@/server/queries";

export interface ForemanRowData extends Foreman {
  summary: ForemanSummary;
}

export function ForemenTable({ foremen }: { foremen: ForemanRowData[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return foremen;
    return foremen.filter((f) =>
      [f.name, f.brigade, f.projectName, f.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [foremen, search]);

  const columns: DataTableColumn<ForemanRowData>[] = [
    {
      id: "name",
      header: "Бригадир",
      accessor: (f) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{f.name}</div>
          <div className="truncate text-xs text-muted-foreground">{f.brigade || "—"}</div>
        </div>
      ),
      sortValue: (f) => f.name,
    },
    {
      id: "project",
      header: "Объект",
      accessor: (f) => (
        <span className="text-muted-foreground">{f.projectName ?? "—"}</span>
      ),
      sortValue: (f) => f.projectName ?? "",
    },
    {
      id: "phone",
      header: "Телефон",
      accessor: (f) => <span className="whitespace-nowrap text-muted-foreground">{f.phone || "—"}</span>,
    },
    {
      id: "onHand",
      header: "Материалов на руках",
      accessor: (f) =>
        f.summary.positions > 0 ? (
          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
            {f.summary.positions} {declOf(f.summary.positions, "позиция", "позиции", "позиций")}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Ничего не числится</span>
        ),
      sortValue: (f) => f.summary.positions,
    },
    {
      id: "issued",
      header: "Выдач",
      accessor: (f) => (
        <span className="tabular-nums text-muted-foreground">{f.summary.issueCount}</span>
      ),
      sortValue: (f) => f.summary.issueCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "used",
      header: "Списаний",
      accessor: (f) => (
        <span className="tabular-nums text-muted-foreground">{f.summary.usageCount}</span>
      ),
      sortValue: (f) => f.summary.usageCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "returned",
      header: "Возвратов",
      accessor: (f) => (
        <span className="tabular-nums text-muted-foreground">{f.summary.returnCount}</span>
      ),
      sortValue: (f) => f.summary.returnCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "last",
      header: "Последняя операция",
      accessor: (f) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {f.summary.lastOperationAt ? formatDate(f.summary.lastOperationAt) : "—"}
        </span>
      ),
      sortValue: (f) => (f.summary.lastOperationAt ? new Date(f.summary.lastOperationAt).getTime() : 0),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по имени, бригаде, объекту..."
          className="pl-8"
          aria-label="Поиск бригадиров"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(f) => f.id}
        pageSize={12}
        emptyMessage="Бригадиры не найдены"
        onRowClick={(f) => router.push(`/foremen/${f.id}`)}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { MovementTypeBadge, DeltaValue } from "@/shared/components/status-badge";
import { ExportMenu } from "@/shared/components/export-menu";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { exportToCsv, exportToXlsx } from "@/lib/export";
import { MOVEMENT_META } from "@/constants/colors";
import type { MovementType, StockMovement } from "@/types";

export type MovementColumnId =
  | "type"
  | "acceptedBy"
  | "issuedBy"
  | "returnAcceptedBy"
  | "date"
  | "material"
  | "quantity"
  | "delta"
  | "foreman"
  | "supplier"
  | "project"
  | "vehicle"
  | "user"
  | "reason"
  | "comment"
  | "stockAfter";

const ALL_COLUMNS: Record<MovementColumnId, DataTableColumn<StockMovement>> = {
  type: {
    id: "type",
    header: "Тип",
    accessor: (m) => <MovementTypeBadge type={m.type} />,
    sortValue: (m) => MOVEMENT_META[m.type].label,
  },
  date: {
    id: "date",
    header: "Дата и время",
    accessor: (m) => <span className="whitespace-nowrap">{formatDateTime(m.occurredAt)}</span>,
    sortValue: (m) => new Date(m.occurredAt).getTime(),
  },
  material: {
    id: "material",
    header: "Материал",
    accessor: (m) => <span className="font-medium">{m.materialName}</span>,
    sortValue: (m) => m.materialName,
  },
  quantity: {
    id: "quantity",
    header: "Количество",
    accessor: (m) => (
      <span className="whitespace-nowrap tabular-nums">{formatQuantity(m.quantity, m.unit)}</span>
    ),
    sortValue: (m) => m.quantity,
    className: "text-right",
    headerClassName: "text-right",
  },
  delta: {
    id: "delta",
    header: "Склад",
    accessor: (m) => <DeltaValue value={m.warehouseDelta} />,
    sortValue: (m) => m.warehouseDelta,
    className: "text-right",
    headerClassName: "text-right",
  },
  stockAfter: {
    id: "stockAfter",
    header: "Остаток после",
    accessor: (m) => (
      <span className="whitespace-nowrap tabular-nums text-muted-foreground">
        {formatQuantity(m.warehouseAfter, m.unit)}
      </span>
    ),
    sortValue: (m) => m.warehouseAfter,
    className: "text-right",
    headerClassName: "text-right",
  },
  foreman: {
    id: "foreman",
    header: "Бригадир",
    accessor: (m) => m.foremanName ?? <span className="text-muted-foreground">—</span>,
    sortValue: (m) => m.foremanName ?? "",
  },
  supplier: {
    id: "supplier",
    header: "Поставщик",
    accessor: (m) => m.supplierName ?? <span className="text-muted-foreground">—</span>,
    sortValue: (m) => m.supplierName ?? "",
  },
  project: {
    id: "project",
    header: "Объект",
    accessor: (m) => m.projectName ?? <span className="text-muted-foreground">—</span>,
    sortValue: (m) => m.projectName ?? "",
  },
  vehicle: {
    id: "vehicle",
    header: "Машина",
    accessor: (m) =>
      m.vehicleNumber ? (
        <span className="whitespace-nowrap font-mono text-xs">{m.vehicleNumber}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    sortValue: (m) => m.vehicleNumber,
  },
  user: {
    id: "user",
    header: "Оформил",
    accessor: (m) => <span className="whitespace-nowrap">{m.userName}</span>,
    sortValue: (m) => m.userName,
  },
  acceptedBy: {
    id: "acceptedBy",
    header: "Принял",
    accessor: (m) => <span className="whitespace-nowrap">{m.userName}</span>,
    sortValue: (m) => m.userName,
  },
  issuedBy: {
    id: "issuedBy",
    header: "Выдал",
    accessor: (m) => <span className="whitespace-nowrap">{m.userName}</span>,
    sortValue: (m) => m.userName,
  },
  returnAcceptedBy: {
    id: "returnAcceptedBy",
    header: "Принял возврат",
    accessor: (m) => <span className="whitespace-nowrap">{m.userName}</span>,
    sortValue: (m) => m.userName,
  },
  reason: {
    id: "reason",
    header: "Причина",
    accessor: (m) => m.reason || <span className="text-muted-foreground">—</span>,
    sortValue: (m) => m.reason,
  },
  comment: {
    id: "comment",
    header: "Комментарий",
    accessor: (m) => (
      <span className="text-muted-foreground">{m.comment || "—"}</span>
    ),
  },
};

const EXPORT_HEADERS = [
  "Тип",
  "Дата",
  "Материал",
  "Количество",
  "Ед. изм.",
  "Изменение склада",
  "Остаток склада после",
  "Поставщик",
  "Бригадир",
  "Объект",
  "Машина",
  "Сотрудник",
  "Причина",
  "Комментарий",
];

function toExportRows(movements: StockMovement[]): (string | number)[][] {
  return movements.map((m) => [
    MOVEMENT_META[m.type].label,
    formatDateTime(m.occurredAt),
    m.materialName,
    m.quantity,
    m.unit,
    m.warehouseDelta,
    m.warehouseAfter,
    m.supplierName ?? "",
    m.foremanName ?? "",
    m.projectName ?? "",
    m.vehicleNumber,
    m.userName,
    m.reason,
    m.comment,
  ]);
}

export function MovementsTable({
  movements,
  columns,
  pageSize = 12,
  emptyMessage = "Операции не найдены",
  searchable = true,
  exportName,
}: {
  movements: StockMovement[];
  columns: MovementColumnId[];
  pageSize?: number;
  emptyMessage?: string;
  searchable?: boolean;
  exportName?: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return movements;
    return movements.filter((m) =>
      [m.materialName, m.userName, m.foremanName, m.supplierName, m.projectName, m.comment, m.vehicleNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [movements, search]);

  const tableColumns = columns.map((id) => ALL_COLUMNS[id]);

  return (
    <div className="space-y-4">
      {(searchable || exportName) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {searchable && (
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по материалу, бригадиру, сотруднику..."
                className="pl-8"
                aria-label="Поиск по операциям"
              />
            </div>
          )}
          {exportName && (
            <ExportMenu
              onExportCsv={() => exportToCsv(`${exportName}.csv`, EXPORT_HEADERS, toExportRows(filtered))}
              onExportXlsx={() =>
                exportToXlsx(`${exportName}.xlsx`, "Операции", EXPORT_HEADERS, toExportRows(filtered))
              }
            />
          )}
        </div>
      )}

      <DataTable
        columns={tableColumns}
        data={filtered}
        rowKey={(m) => m.id}
        pageSize={pageSize}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}

export { EXPORT_HEADERS as MOVEMENT_EXPORT_HEADERS, toExportRows as movementsToExportRows };
export type { MovementType };

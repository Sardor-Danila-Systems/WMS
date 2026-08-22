"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { MovementTypeBadge, DeltaValue } from "@/shared/components/status-badge";
import { ExportMenu } from "@/shared/components/export-menu";
import { Input } from "@/components/ui/input";
import { formatDate, formatDateTime, formatQuantity } from "@/lib/format";
import { exportToCsv, exportToXlsx } from "@/lib/export";
import { useIntlTag, useT } from "@/i18n/client";
import { useValueTranslator } from "@/i18n/values";
import type { StockMovement } from "@/types";

export type MovementColumnId =
  | "type"
  | "date"
  | "material"
  | "quantity"
  | "delta"
  | "stockAfter"
  | "foreman"
  | "supplier"
  | "project"
  | "vehicle"
  | "acceptedBy"
  | "issuedBy"
  | "returnAcceptedBy"
  | "user"
  | "reason"
  | "comment";

type Translate = ReturnType<typeof useT>;

/** Колонки собираются с уже готовыми переводчиками, чтобы хуки вызывались
 *  только в самом компоненте. */
function buildColumns(
  t: Translate,
  locale: string,
  unitOf: (unit: string) => string,
  reasonOf: (reason: string) => string
): Record<MovementColumnId, DataTableColumn<StockMovement>> {
  const numeric = { className: "text-right", headerClassName: "text-right" };
  const person = (header: string): DataTableColumn<StockMovement> => ({
    id: header,
    header,
    accessor: (m) => <span className="whitespace-nowrap">{m.userName}</span>,
    sortValue: (m) => m.userName,
  });

  return {
    type: {
      id: "type",
      header: t("history.filters.type"),
      accessor: (m) => <MovementTypeBadge type={m.type} />,
      sortValue: (m) => t(`movements.${m.type}`),
    },
    date: {
      id: "date",
      header: t("operations.dateTime"),
      accessor: (m) => (
        <span className="whitespace-nowrap tabular-nums">{formatDateTime(m.occurredAt, locale)}</span>
      ),
      sortValue: (m) => new Date(m.occurredAt).getTime(),
    },
    material: {
      id: "material",
      header: t("operations.material"),
      accessor: (m) => <span className="font-medium">{m.materialName}</span>,
      sortValue: (m) => m.materialName,
    },
    quantity: {
      id: "quantity",
      header: t("operations.quantity"),
      accessor: (m) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {formatQuantity(m.quantity, unitOf(m.unit), locale)}
        </span>
      ),
      sortValue: (m) => m.quantity,
      ...numeric,
    },
    delta: {
      id: "delta",
      header: t("operations.warehouseDelta"),
      accessor: (m) => <DeltaValue value={m.warehouseDelta} />,
      sortValue: (m) => m.warehouseDelta,
      ...numeric,
    },
    stockAfter: {
      id: "stockAfter",
      header: t("operations.stockAfter"),
      accessor: (m) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatQuantity(m.warehouseAfter, unitOf(m.unit), locale)}
        </span>
      ),
      sortValue: (m) => m.warehouseAfter,
      ...numeric,
    },
    foreman: {
      id: "foreman",
      header: t("operations.foreman"),
      accessor: (m) => m.foremanName ?? <span className="text-muted-foreground">—</span>,
      sortValue: (m) => m.foremanName ?? "",
    },
    supplier: {
      id: "supplier",
      header: t("operations.supplier"),
      accessor: (m) => m.supplierName ?? <span className="text-muted-foreground">—</span>,
      sortValue: (m) => m.supplierName ?? "",
    },
    project: {
      id: "project",
      header: t("operations.project"),
      accessor: (m) => m.projectName ?? <span className="text-muted-foreground">—</span>,
      sortValue: (m) => m.projectName ?? "",
    },
    vehicle: {
      id: "vehicle",
      header: t("operations.vehicle"),
      accessor: (m) =>
        m.vehicleNumber ? (
          <span className="whitespace-nowrap font-mono text-[13px]">{m.vehicleNumber}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (m) => m.vehicleNumber,
    },
    acceptedBy: { ...person(t("operations.acceptedBy")), id: "acceptedBy" },
    issuedBy: { ...person(t("operations.issuedBy")), id: "issuedBy" },
    returnAcceptedBy: { ...person(t("operations.returnAcceptedBy")), id: "returnAcceptedBy" },
    user: { ...person(t("operations.processedBy")), id: "user" },
    reason: {
      id: "reason",
      header: t("operations.reason"),
      accessor: (m) =>
        m.reason ? (
          reasonOf(m.reason)
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (m) => m.reason,
    },
    comment: {
      id: "comment",
      header: t("operations.comment"),
      accessor: (m) => <span className="text-muted-foreground">{m.comment || "—"}</span>,
    },
  };
}

export function MovementsTable({
  movements,
  columns,
  pageSize = 12,
  emptyMessage,
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
  const t = useT();
  const unitLabel = useValueTranslator("units");
  const reasonLabel = useValueTranslator("returnReasons");
  const locale = useIntlTag();
  const [search, setSearch] = useState("");
  const unitOf = (unit: string) => unitLabel(unit);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return movements;
    return movements.filter((m) =>
      [m.materialName, m.userName, m.foremanName, m.supplierName, m.projectName, m.comment, m.vehicleNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [movements, search]);

  const all = buildColumns(t, locale, unitLabel, reasonLabel);
  const tableColumns = columns.map((id) => all[id]);

  const exportHeaders = [
    t("history.filters.type"),
    t("operations.date"),
    t("operations.material"),
    t("operations.quantity"),
    t("materials.unit"),
    t("operations.warehouseDelta"),
    t("operations.stockAfter"),
    t("operations.supplier"),
    t("operations.foreman"),
    t("operations.project"),
    t("operations.vehicle"),
    t("operations.employee"),
    t("operations.reason"),
    t("operations.comment"),
  ];

  const exportRows = () =>
    filtered.map((m) => [
      t(`movements.${m.type}`),
      formatDateTime(m.occurredAt, locale),
      m.materialName,
      m.quantity,
      unitOf(m.unit),
      m.warehouseDelta,
      m.warehouseAfter,
      m.supplierName ?? "",
      m.foremanName ?? "",
      m.projectName ?? "",
      m.vehicleNumber,
      m.userName,
      reasonLabel(m.reason),
      m.comment,
    ]);

  return (
    <div className="space-y-3">
      {(searchable || exportName) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {searchable && (
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("operations.searchPlaceholder")}
                className="pl-8"
                aria-label={t("common.search")}
              />
            </div>
          )}
          {exportName && (
            <ExportMenu
              onExportCsv={() => exportToCsv(`${exportName}.csv`, exportHeaders, exportRows())}
              onExportXlsx={() =>
                exportToXlsx(`${exportName}.xlsx`, t("nav.history"), exportHeaders, exportRows())
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
        emptyMessage={emptyMessage ?? t("operations.notFound")}
        mobileCard={(m) => ({
          title: (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <MovementTypeBadge type={m.type} />
              <span>{m.materialName}</span>
            </span>
          ),
          subtitle: (
            <>
              {formatDate(m.occurredAt, locale)}
              {m.foremanName && ` · ${m.foremanName}`}
              {m.supplierName && ` · ${m.supplierName}`}
              {m.projectName && ` · ${m.projectName}`}
            </>
          ),
          trailing: (
            <div className="text-[14.5px] font-semibold tabular-nums">
              {formatQuantity(m.quantity, unitOf(m.unit), locale)}
            </div>
          ),
        })}
      />
    </div>
  );
}

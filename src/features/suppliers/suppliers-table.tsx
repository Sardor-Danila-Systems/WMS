"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { ExportMenu } from "@/shared/components/export-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";
import { exportToCsv, exportToXlsx } from "@/lib/export";
import { matchesSearch } from "@/lib/search";
import { useIntlTag, useT } from "@/i18n/client";
import type { Supplier } from "@/types";
import type { SupplierSummary } from "@/server/queries";
import { SupplierFormDialog } from "./supplier-form-dialog";

export interface SupplierRowData extends Supplier {
  summary: SupplierSummary;
}

export function SuppliersTable({ suppliers }: { suppliers: SupplierRowData[] }) {
  const t = useT();
  const locale = useIntlTag();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => suppliers.filter((s) => matchesSearch(search, [s.name, s.contact, s.phone, s.inn])),
    [suppliers, search]
  );

  const numeric = { className: "text-right", headerClassName: "text-right" };
  const dash = <span className="text-muted-foreground">—</span>;

  const columns: DataTableColumn<SupplierRowData>[] = [
    {
      id: "name",
      header: t("suppliers.name"),
      accessor: (s) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{s.name}</span>
            {!s.isActive && (
              <Badge variant="outline" className="shrink-0 text-muted-foreground">
                {t("suppliers.inactive")}
              </Badge>
            )}
          </div>
          <div className="truncate text-[13px] text-muted-foreground">{s.contact || "—"}</div>
        </div>
      ),
      sortValue: (s) => s.name,
    },
    {
      id: "phone",
      header: t("suppliers.phone"),
      accessor: (s) => (
        <span className="whitespace-nowrap text-muted-foreground">{s.phone || "—"}</span>
      ),
      sortValue: (s) => s.phone,
    },
    {
      id: "receipts",
      header: t("suppliers.receiptCount"),
      accessor: (s) => (
        <span className="tabular-nums text-muted-foreground">{s.summary.receiptCount}</span>
      ),
      sortValue: (s) => s.summary.receiptCount,
      ...numeric,
    },
    {
      id: "amount",
      header: t("suppliers.amount"),
      accessor: (s) =>
        s.summary.amount > 0 ? (
          <span className="whitespace-nowrap font-medium tabular-nums">
            {formatMoney(s.summary.amount, locale)}
          </span>
        ) : (
          dash
        ),
      sortValue: (s) => s.summary.amount,
      ...numeric,
    },
    {
      id: "cash",
      header: t("suppliers.cash"),
      accessor: (s) =>
        s.summary.cashAmount > 0 ? (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {formatMoney(s.summary.cashAmount, locale)}
          </span>
        ) : (
          dash
        ),
      sortValue: (s) => s.summary.cashAmount,
      ...numeric,
    },
    {
      id: "transfer",
      header: t("suppliers.transfer"),
      accessor: (s) =>
        s.summary.transferAmount > 0 ? (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {formatMoney(s.summary.transferAmount, locale)}
          </span>
        ) : (
          dash
        ),
      sortValue: (s) => s.summary.transferAmount,
      ...numeric,
    },
    {
      id: "last",
      header: t("suppliers.lastReceipt"),
      accessor: (s) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {s.summary.lastReceiptAt ? formatDate(s.summary.lastReceiptAt, locale) : "—"}
        </span>
      ),
      sortValue: (s) => (s.summary.lastReceiptAt ? new Date(s.summary.lastReceiptAt).getTime() : 0),
    },
    {
      id: "actions",
      header: t("common.actions"),
      accessor: (s) => <SupplierFormDialog supplier={s} />,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  const headers = [
    t("suppliers.name"),
    t("suppliers.contact"),
    t("suppliers.phone"),
    t("suppliers.inn"),
    t("suppliers.receiptCount"),
    t("suppliers.materialsCount"),
    t("suppliers.amount"),
    t("suppliers.cash"),
    t("suppliers.transfer"),
    t("suppliers.lastReceipt"),
  ];

  const rows = () =>
    filtered.map((s) => [
      s.name,
      s.contact,
      s.phone,
      s.inn,
      s.summary.receiptCount,
      s.summary.materialCount,
      s.summary.amount,
      s.summary.cashAmount,
      s.summary.transferAmount,
      s.summary.lastReceiptAt ? formatDate(s.summary.lastReceiptAt, locale) : "",
    ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("suppliers.searchPlaceholder")}
            className="pl-8"
            aria-label={t("common.search")}
          />
        </div>
        <ExportMenu
          onExportCsv={() => exportToCsv("postavshchiki.csv", headers, rows())}
          onExportXlsx={() => exportToXlsx("postavshchiki.xlsx", t("nav.suppliers"), headers, rows())}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(s) => s.id}
        pageSize={12}
        emptyMessage={t("suppliers.notFound")}
        mobileCard={(s) => ({
          title: s.name,
          subtitle: (
            <>
              {s.contact || "—"}
              {s.phone && ` · ${s.phone}`}
            </>
          ),
          trailing: (
            <div className="space-y-1">
              {s.summary.amount > 0 && (
                <div className="text-[14px] font-semibold tabular-nums">
                  {formatMoney(s.summary.amount, locale)}
                </div>
              )}
              <SupplierFormDialog supplier={s} />
            </div>
          ),
        })}
      />
    </div>
  );
}

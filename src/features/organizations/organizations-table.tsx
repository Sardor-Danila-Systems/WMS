"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";
import { matchesSearch } from "@/lib/search";
import { useIntlTag, useT } from "@/i18n/client";
import type { Organization } from "@/types";
import type { OrganizationSummary } from "@/server/queries";
import { OrganizationFormDialog } from "./organization-form-dialog";

export interface OrganizationRowData extends Organization {
  summary: OrganizationSummary;
}

export function OrganizationsTable({ organizations }: { organizations: OrganizationRowData[] }) {
  const t = useT();
  const locale = useIntlTag();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => organizations.filter((o) => matchesSearch(search, [o.name, o.address, o.inn, o.phone])),
    [organizations, search]
  );

  const numeric = { className: "text-right", headerClassName: "text-right" };

  const columns: DataTableColumn<OrganizationRowData>[] = [
    {
      id: "name",
      header: t("organizations.name"),
      accessor: (o) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{o.name}</span>
            {!o.isActive && (
              <Badge variant="outline" className="shrink-0 text-muted-foreground">
                {t("organizations.closed")}
              </Badge>
            )}
          </div>
          <div className="truncate text-[13px] text-muted-foreground">{o.address || "—"}</div>
        </div>
      ),
      sortValue: (o) => o.name,
    },
    {
      id: "inn",
      header: t("organizations.inn"),
      accessor: (o) => (
        <span className="whitespace-nowrap font-mono text-[13px] text-muted-foreground">
          {o.inn || "—"}
        </span>
      ),
      sortValue: (o) => o.inn,
    },
    {
      id: "blocks",
      header: t("organizations.blocksCount"),
      accessor: (o) => <span className="tabular-nums text-muted-foreground">{o.summary.blocksCount}</span>,
      sortValue: (o) => o.summary.blocksCount,
      ...numeric,
    },
    {
      id: "receipt",
      header: t("organizations.receiptAmount"),
      accessor: (o) =>
        o.summary.receiptAmount > 0 ? (
          <span className="whitespace-nowrap tabular-nums text-[#1d4e7f]">
            {formatMoney(o.summary.receiptAmount, locale)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (o) => o.summary.receiptAmount,
      ...numeric,
    },
    {
      id: "issue",
      header: t("organizations.issueAmount"),
      accessor: (o) =>
        o.summary.issueAmount > 0 ? (
          <span className="whitespace-nowrap tabular-nums text-[#9c4d16]">
            {formatMoney(o.summary.issueAmount, locale)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (o) => o.summary.issueAmount,
      ...numeric,
    },
    {
      id: "last",
      header: t("organizations.lastOperation"),
      accessor: (o) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {o.summary.lastOperationAt ? formatDate(o.summary.lastOperationAt, locale) : "—"}
        </span>
      ),
      sortValue: (o) => (o.summary.lastOperationAt ? new Date(o.summary.lastOperationAt).getTime() : 0),
    },
    {
      id: "actions",
      header: t("common.actions"),
      accessor: (o) => <OrganizationFormDialog organization={o} />,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("common.search")}
          className="pl-8"
          aria-label={t("common.search")}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(o) => o.id}
        pageSize={12}
        emptyMessage={t("organizations.notFound")}
        mobileCard={(o) => ({
          title: o.name,
          subtitle: (
            <>
              {o.address || "—"}
              {o.inn && ` · ${t("organizations.inn")} ${o.inn}`}
            </>
          ),
          trailing: <OrganizationFormDialog organization={o} />,
        })}
      />
    </div>
  );
}

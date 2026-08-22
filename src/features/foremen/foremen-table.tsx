"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { useIntlTag, useT } from "@/i18n/client";
import type { Foreman } from "@/types";
import type { ForemanSummary } from "@/server/queries";

export interface ForemanRowData extends Foreman {
  summary: ForemanSummary;
}

export function ForemenTable({ foremen }: { foremen: ForemanRowData[] }) {
  const router = useRouter();
  const t = useT();
  const locale = useIntlTag();
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
      header: t("operations.foreman"),
      accessor: (f) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{f.name}</div>
          <div className="truncate text-[13px] text-muted-foreground">{f.brigade || "—"}</div>
        </div>
      ),
      sortValue: (f) => f.name,
    },
    {
      id: "project",
      header: t("operations.project"),
      accessor: (f) => (
        <span className="text-muted-foreground">{f.projectName ?? "—"}</span>
      ),
      sortValue: (f) => f.projectName ?? "",
    },
    {
      id: "phone",
      header: t("foremen.phone"),
      accessor: (f) => <span className="whitespace-nowrap text-muted-foreground">{f.phone || "—"}</span>,
    },
    {
      id: "onHand",
      header: t("foremen.onHand"),
      accessor: (f) =>
        f.summary.positions > 0 ? (
          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
            {t("dashboard.positions", { count: f.summary.positions })}
          </Badge>
        ) : (
          <span className="text-[13px] text-muted-foreground">{t("foremen.nothingOnHand")}</span>
        ),
      sortValue: (f) => f.summary.positions,
    },
    {
      id: "issued",
      header: t("foremen.issueCount"),
      accessor: (f) => (
        <span className="tabular-nums text-muted-foreground">{f.summary.issueCount}</span>
      ),
      sortValue: (f) => f.summary.issueCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "used",
      header: t("foremen.usageCount"),
      accessor: (f) => (
        <span className="tabular-nums text-muted-foreground">{f.summary.usageCount}</span>
      ),
      sortValue: (f) => f.summary.usageCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "returned",
      header: t("foremen.returnCount"),
      accessor: (f) => (
        <span className="tabular-nums text-muted-foreground">{f.summary.returnCount}</span>
      ),
      sortValue: (f) => f.summary.returnCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "last",
      header: t("foremen.lastOperation"),
      accessor: (f) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {f.summary.lastOperationAt ? formatDate(f.summary.lastOperationAt, locale) : "—"}
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
          placeholder={t("foremen.searchPlaceholder")}
          className="pl-8"
          aria-label={t("common.search")}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(f) => f.id}
        pageSize={12}
        emptyMessage={t("foremen.notFound")}
        onRowClick={(f) => router.push(`/foremen/${f.id}`)}
        mobileCard={(f) => ({
          title: f.name,
          subtitle: (
            <>
              {f.brigade || "—"}
              {f.projectName && ` · ${f.projectName}`}
            </>
          ),
          trailing:
            f.summary.positions > 0 ? (
              <Badge variant="outline" className="border-[#f3ddc4] bg-[#fdf2e9] text-[#9c4d16]">
                {f.summary.positions}
              </Badge>
            ) : null,
        })}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";
import { matchesSearch } from "@/lib/search";
import { useIntlTag, useT } from "@/i18n/client";
import type { Block } from "@/types";
import type { BlockSummary } from "@/server/queries";

export interface BlockRowData extends Block {
  summary: BlockSummary;
}

export function BlocksTable({ blocks }: { blocks: BlockRowData[] }) {
  const router = useRouter();
  const t = useT();
  const locale = useIntlTag();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      blocks.filter((b) => matchesSearch(search, [b.name, b.description, b.organizationName])),
    [blocks, search]
  );

  const numeric = { className: "text-right", headerClassName: "text-right" };

  const columns: DataTableColumn<BlockRowData>[] = [
    {
      id: "name",
      header: t("operations.block"),
      accessor: (b) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{b.name}</div>
          <div className="truncate text-[13px] text-muted-foreground">{b.description || "—"}</div>
        </div>
      ),
      sortValue: (b) => b.sortOrder,
    },
    {
      id: "organization",
      header: t("operations.organization"),
      accessor: (b) => <span className="text-muted-foreground">{b.organizationName ?? "—"}</span>,
      sortValue: (b) => b.organizationName ?? "",
    },
    {
      id: "onHand",
      header: t("blocks.onHand"),
      accessor: (b) =>
        b.summary.positions > 0 ? (
          <Badge variant="outline" className="border-[#f3ddc4] bg-[#fdf2e9] text-[#9c4d16]">
            {t("dashboard.positions", { count: b.summary.positions })}
          </Badge>
        ) : (
          <span className="text-[13px] text-muted-foreground">{t("blocks.nothingOnHand")}</span>
        ),
      sortValue: (b) => b.summary.positions,
    },
    {
      id: "issued",
      header: t("blocks.issueCount"),
      accessor: (b) => <span className="tabular-nums text-muted-foreground">{b.summary.issueCount}</span>,
      sortValue: (b) => b.summary.issueCount,
      ...numeric,
    },
    {
      id: "returned",
      header: t("blocks.returnCount"),
      accessor: (b) => <span className="tabular-nums text-muted-foreground">{b.summary.returnCount}</span>,
      sortValue: (b) => b.summary.returnCount,
      ...numeric,
    },
    {
      id: "amount",
      header: t("blocks.amount"),
      accessor: (b) =>
        b.summary.amount > 0 ? (
          <span className="whitespace-nowrap font-medium tabular-nums">
            {formatMoney(b.summary.amount, locale)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (b) => b.summary.amount,
      ...numeric,
    },
    {
      id: "last",
      header: t("blocks.lastOperation"),
      accessor: (b) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {b.summary.lastOperationAt ? formatDate(b.summary.lastOperationAt, locale) : "—"}
        </span>
      ),
      sortValue: (b) => (b.summary.lastOperationAt ? new Date(b.summary.lastOperationAt).getTime() : 0),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("blocks.searchPlaceholder")}
          className="pl-8"
          aria-label={t("common.search")}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(b) => b.id}
        pageSize={12}
        emptyMessage={t("blocks.notFound")}
        onRowClick={(b) => router.push(`/blocks/${b.id}`)}
        mobileCard={(b) => ({
          title: b.name,
          subtitle: (
            <>
              {b.description || "—"}
              {b.organizationName && ` · ${b.organizationName}`}
            </>
          ),
          trailing:
            b.summary.positions > 0 ? (
              <Badge variant="outline" className="border-[#f3ddc4] bg-[#fdf2e9] text-[#9c4d16]">
                {b.summary.positions}
              </Badge>
            ) : null,
        })}
      />
    </div>
  );
}

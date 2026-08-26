"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Blocks, Boxes, FileBarChart, Truck } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { ExportMenu } from "@/shared/components/export-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportToCsv, exportToXlsx } from "@/lib/export";
import { formatMoney, formatQuantity } from "@/lib/format";
import { getStockStatus } from "@/constants/colors";
import { useIntlTag, useT } from "@/i18n/client";
import { useValueTranslator } from "@/i18n/values";
import { StockStatusBadge } from "@/shared/components/status-badge";
import type { BlockReportRow, StockReportRow, SupplierReportRow } from "@/server/queries";

export const REPORT_PERIOD_KEYS = ["all", "7", "30", "90"] as const;

export function ReportsView({
  stock,
  blocks,
  suppliers,
  period,
}: {
  stock: StockReportRow[];
  blocks: BlockReportRow[];
  suppliers: SupplierReportRow[];
  period: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = useT();
  const unitLabel = useValueTranslator("units");
  const categoryLabel = useValueTranslator("categories");
  const locale = useIntlTag();
  const unitOf = (unit: string) => unitLabel(unit);

  const numeric = { className: "text-right", headerClassName: "text-right" };
  const money = (value: number) =>
    value > 0 ? (
      <span className="whitespace-nowrap tabular-nums">{formatMoney(value, locale)}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );

  const periodLabels: Record<string, string> = {
    all: t("periods.all"),
    "7": t("periods.days7"),
    "30": t("periods.days30"),
    "90": t("periods.days90"),
  };

  const STOCK_HEADERS = [
    t("operations.material"),
    t("materials.category"),
    t("materials.unit"),
    t("reports.stock.price"),
    t("materials.atWarehouse"),
    t("reports.stock.value"),
    t("reports.stock.atBlocks"),
    t("common.total"),
    t("materials.minStockShort"),
    t("common.status"),
    t("reports.stock.received"),
    t("reports.stock.receivedAmount"),
    t("reports.stock.issued"),
    t("reports.stock.issuedAmount"),
    t("reports.stock.returned"),
  ];
  const BLOCK_HEADERS = [
    t("operations.block"),
    t("blocks.description"),
    t("operations.organization"),
    t("operations.material"),
    t("materials.unit"),
    t("blocks.detail.issued"),
    t("blocks.detail.returned"),
    t("blocks.detail.onHand"),
    t("money.amount"),
  ];
  const SUPPLIER_HEADERS = [
    t("suppliers.name"),
    t("suppliers.contact"),
    t("operations.material"),
    t("materials.unit"),
    t("reports.suppliers.received"),
    t("reports.suppliers.lastPrice"),
    t("money.amount"),
    t("suppliers.cash"),
    t("suppliers.transfer"),
  ];

  function setPeriod(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete("period");
    else params.set("period", value);
    const query = params.toString();
    startTransition(() => router.replace(query ? `/reports?${query}` : "/reports", { scroll: false }));
  }

  const stockRows = () =>
    stock.map((r) => [
      r.materialName,
      categoryLabel(r.category),
      unitOf(r.unit),
      r.price,
      r.atWarehouse,
      r.value,
      r.atBlocks,
      r.total,
      r.minStock,
      t(`stockStatus.${getStockStatus(r.atWarehouse, r.minStock)}`),
      r.received,
      r.receivedAmount,
      r.issued,
      r.issuedAmount,
      r.returned,
    ]);

  const blockRows = () =>
    blocks.map((r) => [
      r.blockName,
      r.description,
      r.organizationName ?? "",
      r.materialName,
      unitOf(r.unit),
      r.issued,
      r.returned,
      r.onHand,
      r.amount,
    ]);

  const supplierRows = () =>
    suppliers.map((r) => [
      r.supplierName,
      r.contact,
      r.materialName,
      unitOf(r.unit),
      r.received,
      r.lastPrice,
      r.amount,
      r.cashAmount,
      r.transferAmount,
    ]);

  const stockColumns: DataTableColumn<StockReportRow>[] = [
    {
      id: "name",
      header: t("operations.material"),
      accessor: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.materialName}</div>
          <div className="truncate text-[13px] text-muted-foreground">{categoryLabel(r.category)}</div>
        </div>
      ),
      sortValue: (r) => r.materialName,
    },
    {
      id: "price",
      header: t("reports.stock.price"),
      accessor: (r) => money(r.price),
      sortValue: (r) => r.price,
      ...numeric,
    },
    {
      id: "atWarehouse",
      header: t("materials.atWarehouse"),
      accessor: (r) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {formatQuantity(r.atWarehouse, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.atWarehouse,
      ...numeric,
    },
    {
      id: "value",
      header: t("reports.stock.value"),
      accessor: (r) => money(r.value),
      sortValue: (r) => r.value,
      ...numeric,
    },
    {
      id: "atBlocks",
      header: t("reports.stock.atBlocks"),
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatQuantity(r.atBlocks, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.atBlocks,
      ...numeric,
    },
    {
      id: "received",
      header: t("reports.stock.received"),
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-[#1d4e7f]">
          {formatQuantity(r.received, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.received,
      ...numeric,
    },
    {
      id: "issued",
      header: t("reports.stock.issued"),
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-[#9c4d16]">
          {formatQuantity(r.issued, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.issued,
      ...numeric,
    },
    {
      id: "returned",
      header: t("reports.stock.returned"),
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-[#463a8c]">
          {formatQuantity(r.returned, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.returned,
      ...numeric,
    },
    {
      id: "status",
      header: t("common.status"),
      accessor: (r) => <StockStatusBadge status={getStockStatus(r.atWarehouse, r.minStock)} />,
      sortValue: (r) => (r.minStock > 0 ? r.atWarehouse / r.minStock : Number.MAX_SAFE_INTEGER),
    },
  ];

  const blockColumns: DataTableColumn<BlockReportRow>[] = [
    {
      id: "name",
      header: t("operations.block"),
      accessor: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.blockName}</div>
          <div className="truncate text-[13px] text-muted-foreground">
            {[r.description, r.organizationName].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
      ),
      sortValue: (r) => r.blockName,
    },
    {
      id: "material",
      header: t("operations.material"),
      accessor: (r) => <span className="truncate">{r.materialName}</span>,
      sortValue: (r) => r.materialName,
    },
    {
      id: "issued",
      header: t("blocks.detail.issued"),
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatQuantity(r.issued, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.issued,
      ...numeric,
    },
    {
      id: "returned",
      header: t("blocks.detail.returned"),
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatQuantity(r.returned, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.returned,
      ...numeric,
    },
    {
      id: "onHand",
      header: t("blocks.detail.onHand"),
      accessor: (r) =>
        r.onHand > 0 ? (
          <span className="whitespace-nowrap font-semibold tabular-nums text-[#9c4d16]">
            {formatQuantity(r.onHand, unitOf(r.unit), locale)}
          </span>
        ) : (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            0 {unitOf(r.unit)}
          </span>
        ),
      sortValue: (r) => r.onHand,
      ...numeric,
    },
    {
      id: "amount",
      header: t("money.amount"),
      accessor: (r) => money(r.amount),
      sortValue: (r) => r.amount,
      ...numeric,
    },
  ];

  const supplierColumns: DataTableColumn<SupplierReportRow>[] = [
    {
      id: "name",
      header: t("suppliers.name"),
      accessor: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.supplierName}</div>
          <div className="truncate text-[13px] text-muted-foreground">{r.contact || "—"}</div>
        </div>
      ),
      sortValue: (r) => r.supplierName,
    },
    {
      id: "material",
      header: t("operations.material"),
      accessor: (r) => <span className="truncate">{r.materialName}</span>,
      sortValue: (r) => r.materialName,
    },
    {
      id: "received",
      header: t("reports.suppliers.received"),
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatQuantity(r.received, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.received,
      ...numeric,
    },
    {
      id: "lastPrice",
      header: t("reports.suppliers.lastPrice"),
      accessor: (r) => money(r.lastPrice),
      sortValue: (r) => r.lastPrice,
      ...numeric,
    },
    {
      id: "amount",
      header: t("money.amount"),
      accessor: (r) =>
        r.amount > 0 ? (
          <span className="whitespace-nowrap font-semibold tabular-nums">
            {formatMoney(r.amount, locale)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (r) => r.amount,
      ...numeric,
    },
    {
      id: "cash",
      header: t("suppliers.cash"),
      accessor: (r) => money(r.cashAmount),
      sortValue: (r) => r.cashAmount,
      ...numeric,
    },
    {
      id: "transfer",
      header: t("suppliers.transfer"),
      accessor: (r) => money(r.transferAmount),
      sortValue: (r) => r.transferAmount,
      ...numeric,
    },
  ];

  const suffix = period === "all" ? "all" : `${period}d`;

  return (
    <div className="space-y-5" data-pending={isPending || undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[14.5px] text-muted-foreground">{t("reports.periodLabel")}</span>
        <Select value={period} onValueChange={(value) => setPeriod(value ?? "all")} items={periodLabels}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder={t("common.period")} />
          </SelectTrigger>
          <SelectContent>
            {REPORT_PERIOD_KEYS.map((value) => (
              <SelectItem key={value} value={value}>
                {periodLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="stock">
        {/* На узком экране три вкладки не помещаются — даём им горизонтальную прокрутку. */}
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="stock" className="gap-1.5">
            <Boxes className="h-3.5 w-3.5" />
            {t("reports.tabs.stock")}
          </TabsTrigger>
          <TabsTrigger value="blocks" className="gap-1.5">
            <Blocks className="h-3.5 w-3.5" />
            {t("reports.tabs.blocks")}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            {t("reports.tabs.suppliers")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4 space-y-3">
          <ReportHeader
            icon={Boxes}
            title={t("reports.stock.title")}
            description={t("reports.stock.description")}
            onCsv={() => exportToCsv(`report-stock-${suffix}.csv`, STOCK_HEADERS, stockRows())}
            onXlsx={() =>
              exportToXlsx(`report-stock-${suffix}.xlsx`, t("reports.tabs.stock"), STOCK_HEADERS, stockRows())
            }
          />
          <DataTable
            columns={stockColumns}
            data={stock}
            rowKey={(r) => r.materialId}
            pageSize={15}
            emptyMessage={t("reports.stock.empty")}
          />
        </TabsContent>

        <TabsContent value="blocks" className="mt-4 space-y-3">
          <ReportHeader
            icon={Blocks}
            title={t("reports.blocks.title")}
            description={t("reports.blocks.description")}
            onCsv={() => exportToCsv(`report-blocks-${suffix}.csv`, BLOCK_HEADERS, blockRows())}
            onXlsx={() =>
              exportToXlsx(`report-blocks-${suffix}.xlsx`, t("nav.blocks"), BLOCK_HEADERS, blockRows())
            }
          />
          <DataTable
            columns={blockColumns}
            data={blocks}
            rowKey={(r) => r.rowId}
            pageSize={15}
            emptyMessage={t("reports.blocks.empty")}
          />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4 space-y-3">
          <ReportHeader
            icon={Truck}
            title={t("reports.suppliers.title")}
            description={t("reports.suppliers.description")}
            onCsv={() => exportToCsv(`report-suppliers-${suffix}.csv`, SUPPLIER_HEADERS, supplierRows())}
            onXlsx={() =>
              exportToXlsx(
                `report-suppliers-${suffix}.xlsx`,
                t("nav.suppliers"),
                SUPPLIER_HEADERS,
                supplierRows()
              )
            }
          />
          <DataTable
            columns={supplierColumns}
            data={suppliers}
            rowKey={(r) => r.rowId}
            pageSize={15}
            emptyMessage={t("reports.suppliers.empty")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportHeader({
  icon: Icon,
  title,
  description,
  onCsv,
  onXlsx,
}: {
  icon: typeof FileBarChart;
  title: string;
  description: string;
  onCsv: () => void;
  onXlsx: () => void;
}) {
  const t = useT();
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-[14.5px] font-semibold">{title}</CardTitle>
            <CardDescription className="text-[13px]">{description}</CardDescription>
          </div>
        </div>
        <ExportMenu onExportCsv={onCsv} onExportXlsx={onXlsx} label={t("common.exportShort")} />
      </CardHeader>
      <CardContent className="hidden" />
    </Card>
  );
}

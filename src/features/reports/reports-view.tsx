"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Boxes, Building2, FileBarChart, HardHat } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { ExportMenu } from "@/shared/components/export-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportToCsv, exportToXlsx } from "@/lib/export";
import { formatQuantity } from "@/lib/format";
import { getStockStatus } from "@/constants/colors";
import { useI18n } from "@/i18n/client";
import { translateValue } from "@/i18n";
import { StockStatusBadge } from "@/shared/components/status-badge";
import type {
  ForemanReportRow,
  ProjectReportRow,
  StockReportRow,
} from "@/server/queries";

export const REPORT_PERIOD_KEYS = ["all", "7", "30", "90"] as const;



export function ReportsView({
  stock,
  foremen,
  projects,
  period,
}: {
  stock: StockReportRow[];
  foremen: ForemanReportRow[];
  projects: ProjectReportRow[];
  period: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { t, locale } = useI18n();
  const unitOf = (unit: string) => translateValue(t.units, unit);

  const periodLabels: Record<string, string> = {
    all: t.periods.all,
    "7": t.periods.days7,
    "30": t.periods.days30,
    "90": t.periods.days90,
  };

  const STOCK_HEADERS = [
    t.operations.material,
    t.materials.category,
    t.materials.unit,
    t.materials.atWarehouse,
    t.materials.atForemen,
    t.common.total,
    t.materials.minStockShort,
    t.common.status,
    t.reports.stock.received,
    t.reports.stock.issued,
    t.reports.stock.used,
    t.reports.stock.returned,
  ];
  const FOREMAN_HEADERS = [
    t.operations.foreman,
    t.foremen.brigade,
    t.operations.project,
    t.operations.material,
    t.materials.unit,
    t.foremen.detail.received,
    t.foremen.detail.used,
    t.foremen.detail.returned,
    t.foremen.detail.onHand,
  ];
  const PROJECT_HEADERS = [
    t.operations.project,
    t.projects.address,
    t.operations.material,
    t.materials.unit,
    t.projects.detail.issued,
    t.projects.detail.used,
    t.projects.detail.remaining,
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
      translateValue(t.categories, r.category),
      unitOf(r.unit),
      r.atWarehouse,
      r.atForemen,
      r.total,
      r.minStock,
      t.stockStatus[getStockStatus(r.atWarehouse, r.minStock)],
      r.received,
      r.issued,
      r.used,
      r.returned,
    ]);

  const foremanRows = () =>
    foremen.map((r) => [
      r.foremanName,
      r.brigade,
      r.projectName ?? "",
      r.materialName,
      unitOf(r.unit),
      r.issued,
      r.used,
      r.returned,
      r.onHand,
    ]);

  const projectRows = () =>
    projects.map((r) => [
      r.projectName,
      r.address,
      r.materialName,
      unitOf(r.unit),
      r.issued,
      r.used,
      r.remaining,
    ]);

  const stockColumns: DataTableColumn<StockReportRow>[] = [
    {
      id: "name",
      header: t.operations.material,
      accessor: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.materialName}</div>
          <div className="truncate text-xs text-muted-foreground">{translateValue(t.categories, r.category)}</div>
        </div>
      ),
      sortValue: (r) => r.materialName,
    },
    {
      id: "atWarehouse",
      header: t.materials.atWarehouse,
      accessor: (r) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {formatQuantity(r.atWarehouse, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.atWarehouse,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "atForemen",
      header: t.reports.stock.atForemen,
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatQuantity(r.atForemen, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.atForemen,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "received",
      header: t.reports.stock.received,
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-blue-700">{formatQuantity(r.received, unitOf(r.unit), locale)}</span>
      ),
      sortValue: (r) => r.received,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "issued",
      header: t.reports.stock.issued,
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-orange-700">{formatQuantity(r.issued, unitOf(r.unit), locale)}</span>
      ),
      sortValue: (r) => r.issued,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "used",
      header: t.reports.stock.used,
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-teal-700">{formatQuantity(r.used, unitOf(r.unit), locale)}</span>
      ),
      sortValue: (r) => r.used,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "returned",
      header: t.reports.stock.returned,
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-violet-700">{formatQuantity(r.returned, unitOf(r.unit), locale)}</span>
      ),
      sortValue: (r) => r.returned,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "status",
      header: t.common.status,
      accessor: (r) => <StockStatusBadge status={getStockStatus(r.atWarehouse, r.minStock)} />,
      sortValue: (r) => (r.minStock > 0 ? r.atWarehouse / r.minStock : Number.MAX_SAFE_INTEGER),
    },
  ];

  const foremanColumns: DataTableColumn<ForemanReportRow>[] = [
    {
      id: "name",
      header: t.operations.foreman,
      accessor: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.foremanName}</div>
          <div className="truncate text-xs text-muted-foreground">
            {[r.brigade, r.projectName].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
      ),
      sortValue: (r) => r.foremanName,
    },
    {
      id: "material",
      header: t.operations.material,
      accessor: (r) => <span className="truncate">{r.materialName}</span>,
      sortValue: (r) => r.materialName,
    },
    {
      id: "issued",
      header: t.foremen.detail.received,
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums">{formatQuantity(r.issued, unitOf(r.unit), locale)}</span>
      ),
      sortValue: (r) => r.issued,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "used",
      header: t.reports.stock.used,
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatQuantity(r.used, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.used,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "returned",
      header: t.reports.stock.returned,
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatQuantity(r.returned, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.returned,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "onHand",
      header: t.foremen.detail.onHand,
      accessor: (r) =>
        r.onHand > 0 ? (
          <span className="whitespace-nowrap font-semibold tabular-nums text-orange-700">
            {formatQuantity(r.onHand, unitOf(r.unit), locale)}
          </span>
        ) : (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">0 {r.unit}</span>
        ),
      sortValue: (r) => r.onHand,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  const projectColumns: DataTableColumn<ProjectReportRow>[] = [
    {
      id: "name",
      header: t.operations.project,
      accessor: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.projectName}</div>
          <div className="truncate text-xs text-muted-foreground">{r.address || "—"}</div>
        </div>
      ),
      sortValue: (r) => r.projectName,
    },
    {
      id: "material",
      header: t.operations.material,
      accessor: (r) => <span className="truncate">{r.materialName}</span>,
      sortValue: (r) => r.materialName,
    },
    {
      id: "issued",
      header: t.projects.detail.issued,
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums">{formatQuantity(r.issued, unitOf(r.unit), locale)}</span>
      ),
      sortValue: (r) => r.issued,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "used",
      header: t.projects.detail.used,
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatQuantity(r.used, unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.used,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "remaining",
      header: t.projects.detail.remaining,
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatQuantity(Math.max(0, r.remaining), unitOf(r.unit), locale)}
        </span>
      ),
      sortValue: (r) => r.remaining,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  const suffix = period === "all" ? "all" : `${period}d`;

  return (
    <div className="space-y-5" data-pending={isPending || undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted-foreground">{t.reports.periodLabel}</span>
        <Select
          value={period}
          onValueChange={(value) => setPeriod(value ?? "all")}
          items={periodLabels}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder={t.common.period} />
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
            {t.reports.tabs.stock}
          </TabsTrigger>
          <TabsTrigger value="foremen" className="gap-1.5">
            <HardHat className="h-3.5 w-3.5" />
            {t.reports.tabs.foremen}
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            {t.reports.tabs.projects}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4 space-y-3">
          <ReportHeader
            icon={Boxes}
            title={t.reports.stock.title}
            description={t.reports.stock.description}
            onCsv={() => exportToCsv(`report-stock-${suffix}.csv`, STOCK_HEADERS, stockRows())}
            onXlsx={() => exportToXlsx(`report-stock-${suffix}.xlsx`, t.reports.tabs.stock, STOCK_HEADERS, stockRows())}
          />
          <DataTable
            columns={stockColumns}
            data={stock}
            rowKey={(r) => r.materialId}
            pageSize={15}
            emptyMessage={t.reports.stock.empty}
          />
        </TabsContent>

        <TabsContent value="foremen" className="mt-4 space-y-3">
          <ReportHeader
            icon={HardHat}
            title={t.reports.foremen.title}
            description={t.reports.foremen.description}
            onCsv={() => exportToCsv(`report-foremen-${suffix}.csv`, FOREMAN_HEADERS, foremanRows())}
            onXlsx={() =>
              exportToXlsx(`report-foremen-${suffix}.xlsx`, t.nav.foremen, FOREMAN_HEADERS, foremanRows())
            }
          />
          <DataTable
            columns={foremanColumns}
            data={foremen}
            rowKey={(r) => r.rowId}
            pageSize={15}
            emptyMessage={t.reports.foremen.empty}
          />
        </TabsContent>

        <TabsContent value="projects" className="mt-4 space-y-3">
          <ReportHeader
            icon={Building2}
            title={t.reports.projects.title}
            description={t.reports.projects.description}
            onCsv={() => exportToCsv(`report-projects-${suffix}.csv`, PROJECT_HEADERS, projectRows())}
            onXlsx={() =>
              exportToXlsx(`report-projects-${suffix}.xlsx`, t.nav.projects, PROJECT_HEADERS, projectRows())
            }
          />
          <DataTable
            columns={projectColumns}
            data={projects}
            rowKey={(r) => r.rowId}
            pageSize={15}
            emptyMessage={t.reports.projects.empty}
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
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-[13px] font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
        <ExportMenu onExportCsv={onCsv} onExportXlsx={onXlsx} label={t.common.exportShort} />
      </CardHeader>
      <CardContent className="hidden" />
    </Card>
  );
}

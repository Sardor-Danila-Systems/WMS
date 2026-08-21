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
import { getStockStatus, STOCK_STATUS } from "@/constants/colors";
import { StockStatusBadge } from "@/shared/components/status-badge";
import type {
  ForemanReportRow,
  ProjectReportRow,
  StockReportRow,
} from "@/server/queries";

export const REPORT_PERIODS = [
  { value: "all", label: "Всё время" },
  { value: "7", label: "Последние 7 дней" },
  { value: "30", label: "Последние 30 дней" },
  { value: "90", label: "Последние 90 дней" },
] as const;

const STOCK_HEADERS = [
  "Материал",
  "Категория",
  "Ед. изм.",
  "На складе",
  "У бригадиров",
  "Всего",
  "Мин. остаток",
  "Статус",
  "Поступило",
  "Выдано",
  "Использовано",
  "Возвращено",
];

const FOREMAN_HEADERS = [
  "Бригадир",
  "Бригада",
  "Объект",
  "Материал",
  "Ед. изм.",
  "Получено",
  "Использовано",
  "Возвращено",
  "Осталось на руках",
];

const PROJECT_HEADERS = [
  "Объект",
  "Адрес",
  "Материал",
  "Ед. изм.",
  "Выдано на объект",
  "Израсходовано",
  "Осталось у бригад",
];

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
      r.category,
      r.unit,
      r.atWarehouse,
      r.atForemen,
      r.total,
      r.minStock,
      STOCK_STATUS[getStockStatus(r.atWarehouse, r.minStock)].label,
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
      r.unit,
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
      r.unit,
      r.issued,
      r.used,
      r.remaining,
    ]);

  const stockColumns: DataTableColumn<StockReportRow>[] = [
    {
      id: "name",
      header: "Материал",
      accessor: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.materialName}</div>
          <div className="truncate text-xs text-muted-foreground">{r.category}</div>
        </div>
      ),
      sortValue: (r) => r.materialName,
    },
    {
      id: "atWarehouse",
      header: "На складе",
      accessor: (r) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {formatQuantity(r.atWarehouse, r.unit)}
        </span>
      ),
      sortValue: (r) => r.atWarehouse,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "atForemen",
      header: "У бригад",
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatQuantity(r.atForemen, r.unit)}
        </span>
      ),
      sortValue: (r) => r.atForemen,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "received",
      header: "Поступило",
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-blue-700">{formatQuantity(r.received, r.unit)}</span>
      ),
      sortValue: (r) => r.received,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "issued",
      header: "Выдано",
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-orange-700">{formatQuantity(r.issued, r.unit)}</span>
      ),
      sortValue: (r) => r.issued,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "used",
      header: "Использовано",
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-teal-700">{formatQuantity(r.used, r.unit)}</span>
      ),
      sortValue: (r) => r.used,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "returned",
      header: "Возвращено",
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-violet-700">{formatQuantity(r.returned, r.unit)}</span>
      ),
      sortValue: (r) => r.returned,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "status",
      header: "Статус",
      accessor: (r) => <StockStatusBadge status={getStockStatus(r.atWarehouse, r.minStock)} />,
      sortValue: (r) => (r.minStock > 0 ? r.atWarehouse / r.minStock : Number.MAX_SAFE_INTEGER),
    },
  ];

  const foremanColumns: DataTableColumn<ForemanReportRow>[] = [
    {
      id: "name",
      header: "Бригадир",
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
      header: "Материал",
      accessor: (r) => <span className="truncate">{r.materialName}</span>,
      sortValue: (r) => r.materialName,
    },
    {
      id: "issued",
      header: "Получено",
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums">{formatQuantity(r.issued, r.unit)}</span>
      ),
      sortValue: (r) => r.issued,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "used",
      header: "Использовано",
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatQuantity(r.used, r.unit)}
        </span>
      ),
      sortValue: (r) => r.used,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "returned",
      header: "Возвращено",
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatQuantity(r.returned, r.unit)}
        </span>
      ),
      sortValue: (r) => r.returned,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "onHand",
      header: "Осталось на руках",
      accessor: (r) =>
        r.onHand > 0 ? (
          <span className="whitespace-nowrap font-semibold tabular-nums text-orange-700">
            {formatQuantity(r.onHand, r.unit)}
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
      header: "Объект",
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
      header: "Материал",
      accessor: (r) => <span className="truncate">{r.materialName}</span>,
      sortValue: (r) => r.materialName,
    },
    {
      id: "issued",
      header: "Выдано на объект",
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums">{formatQuantity(r.issued, r.unit)}</span>
      ),
      sortValue: (r) => r.issued,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "used",
      header: "Израсходовано",
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatQuantity(r.used, r.unit)}
        </span>
      ),
      sortValue: (r) => r.used,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "remaining",
      header: "Осталось у бригад",
      accessor: (r) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatQuantity(Math.max(0, r.remaining), r.unit)}
        </span>
      ),
      sortValue: (r) => r.remaining,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  const suffix = period === "all" ? "za-vse-vremya" : `za-${period}-dney`;

  return (
    <div className="space-y-5" data-pending={isPending || undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Период оборотов:</span>
        <Select
          value={period}
          onValueChange={(value) => setPeriod(value ?? "all")}
          items={Object.fromEntries(REPORT_PERIODS.map((o) => [o.value, o.label]))}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Период" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_PERIODS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
            Остатки
          </TabsTrigger>
          <TabsTrigger value="foremen" className="gap-1.5">
            <HardHat className="h-3.5 w-3.5" />
            По бригадирам
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            По объектам
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4 space-y-3">
          <ReportHeader
            icon={Boxes}
            title="Остатки на текущий момент и обороты за период"
            description="Сколько материала на складе, сколько на руках у бригад и как двигался материал за выбранный период"
            onCsv={() => exportToCsv(`otchet-ostatki-${suffix}.csv`, STOCK_HEADERS, stockRows())}
            onXlsx={() => exportToXlsx(`otchet-ostatki-${suffix}.xlsx`, "Остатки", STOCK_HEADERS, stockRows())}
          />
          <DataTable
            columns={stockColumns}
            data={stock}
            rowKey={(r) => r.materialId}
            pageSize={15}
            emptyMessage="Нет материалов для отчёта"
          />
        </TabsContent>

        <TabsContent value="foremen" className="mt-4 space-y-3">
          <ReportHeader
            icon={HardHat}
            title="Движение материалов по бригадирам"
            description="По каждому бригадиру и материалу: получено, израсходовано, возвращено и что осталось на руках"
            onCsv={() => exportToCsv(`otchet-brigadiry-${suffix}.csv`, FOREMAN_HEADERS, foremanRows())}
            onXlsx={() =>
              exportToXlsx(`otchet-brigadiry-${suffix}.xlsx`, "Бригадиры", FOREMAN_HEADERS, foremanRows())
            }
          />
          <DataTable
            columns={foremanColumns}
            data={foremen}
            rowKey={(r) => r.rowId}
            pageSize={15}
            emptyMessage="Нет бригадиров для отчёта"
          />
        </TabsContent>

        <TabsContent value="projects" className="mt-4 space-y-3">
          <ReportHeader
            icon={Building2}
            title="Расход материалов по объектам"
            description="По каждому объекту и материалу: сколько выдано, израсходовано и осталось у бригад"
            onCsv={() => exportToCsv(`otchet-obekty-${suffix}.csv`, PROJECT_HEADERS, projectRows())}
            onXlsx={() =>
              exportToXlsx(`otchet-obekty-${suffix}.xlsx`, "Объекты", PROJECT_HEADERS, projectRows())
            }
          />
          <DataTable
            columns={projectColumns}
            data={projects}
            rowKey={(r) => r.rowId}
            pageSize={15}
            emptyMessage="Нет объектов для отчёта"
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
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
        <ExportMenu onExportCsv={onCsv} onExportXlsx={onXlsx} label="Выгрузить" />
      </CardHeader>
      <CardContent className="hidden" />
    </Card>
  );
}

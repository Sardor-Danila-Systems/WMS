"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { getStockStatus, STOCK_STATUS } from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { StockStatusBadge } from "@/shared/components/status-badge";
import { ExportMenu } from "@/shared/components/export-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDate, formatQuantity } from "@/lib/format";
import { exportToCsv, exportToXlsx } from "@/lib/export";
import type { Material } from "@/types";

const EXPORT_HEADERS = [
  "Название",
  "Категория",
  "Ед. изм.",
  "Остаток на складе",
  "На руках у бригадиров",
  "Всего в обороте",
  "Мин. остаток",
  "Статус",
  "Последнее поступление",
];

export function MaterialsTable({
  materials,
  initialLowStockOnly = false,
}: {
  materials: Material[];
  initialLowStockOnly?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [onlyLowStock, setOnlyLowStock] = useState(initialLowStockOnly);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (term && !m.name.toLowerCase().includes(term) && !m.category.toLowerCase().includes(term)) {
        return false;
      }
      if (category !== "all" && m.category !== category) return false;
      if (onlyLowStock && getStockStatus(m.quantity, m.minStock) === "good") return false;
      return true;
    });
  }, [materials, search, category, onlyLowStock]);

  const columns: DataTableColumn<Material>[] = [
    {
      id: "name",
      header: "Название",
      accessor: (m) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{m.name}</div>
          <div className="truncate text-xs text-muted-foreground">{m.category}</div>
        </div>
      ),
      sortValue: (m) => m.name,
    },
    {
      id: "quantity",
      header: "На складе",
      accessor: (m) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {formatQuantity(m.quantity, m.unit)}
        </span>
      ),
      sortValue: (m) => m.quantity,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "atForemen",
      header: "У бригадиров",
      accessor: (m) =>
        m.atForemen > 0 ? (
          <span className="whitespace-nowrap tabular-nums text-orange-700">
            {formatQuantity(m.atForemen, m.unit)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (m) => m.atForemen,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "minStock",
      header: "Мин. остаток",
      accessor: (m) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatQuantity(m.minStock, m.unit)}
        </span>
      ),
      sortValue: (m) => m.minStock,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "status",
      header: "Статус",
      accessor: (m) => <StockStatusBadge status={getStockStatus(m.quantity, m.minStock)} />,
      sortValue: (m) => (m.minStock > 0 ? m.quantity / m.minStock : Number.MAX_SAFE_INTEGER),
    },
    {
      id: "lastReceipt",
      header: "Последнее поступление",
      accessor: (m) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {m.lastReceiptDate ? formatDate(m.lastReceiptDate) : "—"}
        </span>
      ),
      sortValue: (m) => (m.lastReceiptDate ? new Date(m.lastReceiptDate).getTime() : 0),
    },
  ];

  const exportRows = () =>
    filtered.map((m) => [
      m.name,
      m.category,
      m.unit,
      m.quantity,
      m.atForemen,
      m.quantity + m.atForemen,
      m.minStock,
      STOCK_STATUS[getStockStatus(m.quantity, m.minStock)].label,
      m.lastReceiptDate ? formatDate(m.lastReceiptDate) : "",
    ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по названию или категории..."
            className="pl-8"
            aria-label="Поиск материалов"
          />
        </div>

        <Select
          value={category}
          onValueChange={(value) => setCategory(value ?? "all")}
          items={{ all: "Все категории", ...Object.fromEntries(CATEGORIES.map((c) => [c, c])) }}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={onlyLowStock ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyLowStock((value) => !value)}
          className="shrink-0 gap-1.5"
          aria-pressed={onlyLowStock}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: STOCK_STATUS.critical.color }}
          />
          Низкий остаток
        </Button>

        <ExportMenu
          onExportCsv={() => exportToCsv("materialy.csv", EXPORT_HEADERS, exportRows())}
          onExportXlsx={() => exportToXlsx("materialy.xlsx", "Материалы", EXPORT_HEADERS, exportRows())}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(m) => m.id}
        pageSize={12}
        emptyMessage="Материалы не найдены"
        onRowClick={(m) => router.push(`/materials/${m.id}`)}
      />
    </div>
  );
}

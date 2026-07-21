"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useWarehouseStore } from "@/store/warehouse-store";
import { getStockStatus, STOCK_STATUS } from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { StockStatusBadge } from "@/shared/components/status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDate, formatQuantity } from "@/lib/format";
import { useLoadingDelay } from "@/hooks/use-loading-delay";
import type { Material } from "@/types";

export function MaterialsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const materials = useWarehouseStore((s) => s.materials);
  const isLoading = useLoadingDelay(400);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [onlyLowStock, setOnlyLowStock] = useState(searchParams.get("filter") === "low-stock");

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "all" && m.category !== category) return false;
      if (onlyLowStock && getStockStatus(m.quantity, m.minStock) === "good") return false;
      return true;
    });
  }, [materials, search, category, onlyLowStock]);

  const columns: DataTableColumn<Material>[] = [
    {
      id: "name",
      header: "Название",
      accessor: (m) => <span className="font-medium">{m.name}</span>,
      sortValue: (m) => m.name,
    },
    {
      id: "category",
      header: "Категория",
      accessor: (m) => <span className="text-muted-foreground">{m.category}</span>,
      sortValue: (m) => m.category,
    },
    {
      id: "unit",
      header: "Ед. изм.",
      accessor: (m) => m.unit,
    },
    {
      id: "quantity",
      header: "Остаток",
      accessor: (m) => <span className="font-medium tabular-nums">{formatQuantity(m.quantity, m.unit)}</span>,
      sortValue: (m) => m.quantity,
    },
    {
      id: "minStock",
      header: "Мин. остаток",
      accessor: (m) => <span className="text-muted-foreground tabular-nums">{formatQuantity(m.minStock, m.unit)}</span>,
      sortValue: (m) => m.minStock,
    },
    {
      id: "status",
      header: "Статус",
      accessor: (m) => <StockStatusBadge status={getStockStatus(m.quantity, m.minStock)} />,
      sortValue: (m) => m.quantity / m.minStock,
    },
    {
      id: "lastReceipt",
      header: "Последнее поступление",
      accessor: (m) => (
        <span className="text-muted-foreground">{m.lastReceiptDate ? formatDate(m.lastReceiptDate) : "—"}</span>
      ),
      sortValue: (m) => (m.lastReceiptDate ? new Date(m.lastReceiptDate).getTime() : 0),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className="pl-8"
          />
        </div>
        <Select value={category} onValueChange={(value) => setCategory(value ?? "all")}>
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
          onClick={() => setOnlyLowStock((v) => !v)}
          className="shrink-0"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STOCK_STATUS.critical.color }} />
          Только низкий остаток
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(m) => m.id}
        isLoading={isLoading}
        pageSize={12}
        emptyMessage="Материалы не найдены"
        onRowClick={(m) => router.push(`/materials/${m.id}`)}
      />
    </div>
  );
}

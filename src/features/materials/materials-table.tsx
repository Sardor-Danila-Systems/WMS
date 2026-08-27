"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { getStockStatus, STOCK_STATUS_COLORS } from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { StockStatusBadge } from "@/shared/components/status-badge";
import { ExportMenu } from "@/shared/components/export-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import { exportToCsv, exportToXlsx } from "@/lib/export";
import { matchesSearch } from "@/lib/search";
import { useIntlTag, useT } from "@/i18n/client";
import { useValueTranslator } from "@/i18n/values";
import type { Material } from "@/types";
import { PriceCell } from "./price-cell";

export function MaterialsTable({
  materials,
  initialLowStockOnly = false,
  canEditPrice = false,
}: {
  materials: Material[];
  initialLowStockOnly?: boolean;
  canEditPrice?: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const unitLabel = useValueTranslator("units");
  const categoryLabel = useValueTranslator("categories");
  const locale = useIntlTag();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [onlyLowStock, setOnlyLowStock] = useState(initialLowStockOnly);

  const unitOf = (unit: string) => unitLabel(unit);
  const categoryOf = (value: string) => categoryLabel(value);

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (
        !matchesSearch(search, [
          m.name,
          m.category,
          categoryOf(m.category),
          m.unit,
          unitOf(m.unit),
        ])
      ) {
        return false;
      }
      if (category !== "all" && m.category !== category) return false;
      if (onlyLowStock && getStockStatus(m.quantity, m.minStock) === "good") return false;
      return true;
    });
  }, [materials, search, category, onlyLowStock, t]);

  const numeric = { className: "text-right", headerClassName: "text-right" };

  const columns: DataTableColumn<Material>[] = [
    {
      id: "name",
      header: t("materials.name"),
      accessor: (m) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{m.name}</div>
          <div className="truncate text-[13px] text-muted-foreground">
            {categoryOf(m.category)} · {unitOf(m.unit)}
          </div>
        </div>
      ),
      sortValue: (m) => m.name,
    },
    {
      id: "quantity",
      header: t("materials.atWarehouse"),
      accessor: (m) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {formatQuantity(m.quantity, unitOf(m.unit), locale)}
        </span>
      ),
      sortValue: (m) => m.quantity,
      ...numeric,
    },
    {
      id: "price",
      header: t("materials.priceColumn"),
      accessor: (m) => <PriceCell material={m} canEdit={canEditPrice} />,
      sortValue: (m) => m.price,
      ...numeric,
    },
    {
      id: "value",
      header: t("materials.valueColumn"),
      accessor: (m) =>
        m.price > 0 && m.quantity > 0 ? (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {formatMoney(m.quantity * m.price, locale)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (m) => m.quantity * m.price,
      ...numeric,
    },
    {
      id: "atBlocks",
      header: t("materials.atBlocks"),
      accessor: (m) =>
        m.atBlocks > 0 ? (
          <span className="whitespace-nowrap tabular-nums text-[#9c4d16]">
            {formatQuantity(m.atBlocks, unitOf(m.unit), locale)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (m) => m.atBlocks,
      ...numeric,
    },
    {
      id: "status",
      header: t("common.status"),
      accessor: (m) => <StockStatusBadge status={getStockStatus(m.quantity, m.minStock)} />,
      sortValue: (m) => (m.minStock > 0 ? m.quantity / m.minStock : Number.MAX_SAFE_INTEGER),
    },
    {
      id: "lastReceipt",
      header: t("materials.lastReceipt"),
      accessor: (m) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {m.lastReceiptDate ? formatDate(m.lastReceiptDate, locale) : "—"}
        </span>
      ),
      sortValue: (m) => (m.lastReceiptDate ? new Date(m.lastReceiptDate).getTime() : 0),
    },
  ];

  const totalValue = filtered.reduce((sum, m) => sum + m.quantity * m.price, 0);

  const headers = [
    t("materials.name"),
    t("materials.category"),
    t("materials.unit"),
    t("materials.priceColumn"),
    t("materials.atWarehouse"),
    t("materials.valueColumn"),
    t("materials.atBlocks"),
    t("common.total"),
    t("materials.minStockShort"),
    t("common.status"),
    t("materials.lastReceipt"),
  ];

  const rows = () =>
    filtered.map((m) => [
      m.name,
      categoryOf(m.category),
      unitOf(m.unit),
      m.price,
      m.quantity,
      m.quantity * m.price,
      m.atBlocks,
      m.quantity + m.atBlocks,
      m.minStock,
      t(`stockStatus.${getStockStatus(m.quantity, m.minStock)}`),
      m.lastReceiptDate ? formatDate(m.lastReceiptDate, locale) : "",
    ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("materials.searchPlaceholder")}
            className="pl-8"
            aria-label={t("common.search")}
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={category}
            onValueChange={(value) => setCategory(value ?? "all")}
            items={{
              all: t("materials.allCategories"),
              ...Object.fromEntries(CATEGORIES.map((c) => [c, categoryOf(c)])),
            }}
          >
            <SelectTrigger className="flex-1 sm:w-52" aria-label={t("materials.category")}>
              <SelectValue placeholder={t("materials.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("materials.allCategories")}</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryOf(c)}
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
              style={{ backgroundColor: STOCK_STATUS_COLORS.critical.color }}
            />
            {t("materials.lowStockFilter")}
          </Button>

          <ExportMenu
            onExportCsv={() => exportToCsv("materialy.csv", headers, rows())}
            onExportXlsx={() => exportToXlsx("materialy.xlsx", t("nav.materials"), headers, rows())}
          />
        </div>
      </div>

      {totalValue > 0 && (
        <p className="text-[13px] text-muted-foreground">
          {t("money.warehouseValue")}:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatMoney(totalValue, locale)} {t("money.currency")}
          </span>
        </p>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(m) => m.id}
        emptyMessage={t("materials.notFound")}
        onRowClick={(m) => router.push(`/materials/${m.id}`)}
        mobileCard={(m) => ({
          title: m.name,
          subtitle: (
            <>
              {categoryOf(m.category)}
              {m.price > 0 && ` · ${formatMoney(m.price, locale)} ${t("money.currency")}`}
              {m.atBlocks > 0 &&
                ` · ${t("materials.atBlocks")}: ${formatQuantity(m.atBlocks, unitOf(m.unit), locale)}`}
            </>
          ),
          trailing: (
            <div className="space-y-1">
              <div className="text-[14.5px] font-semibold tabular-nums">
                {formatQuantity(m.quantity, unitOf(m.unit), locale)}
              </div>
              <StockStatusBadge status={getStockStatus(m.quantity, m.minStock)} />
            </div>
          ),
        })}
      />
    </div>
  );
}

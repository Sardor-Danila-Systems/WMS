"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useWarehouseStore } from "@/store/warehouse-store";
import { getLowStockMaterials } from "@/store/selectors";
import { getStockStatus } from "@/constants/colors";
import { StockStatusBadge } from "@/shared/components/status-badge";
import { EmptyState } from "@/shared/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatQuantity } from "@/lib/format";

export function LowStockList() {
  const materials = useWarehouseStore((s) => s.materials);
  const lowStock = useMemo(() => getLowStockMaterials(materials).slice(0, 6), [materials]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Материалы с низким остатком</CardTitle>
        <Link href="/materials?filter=low-stock" className="text-xs text-primary hover:underline">
          Все материалы
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {lowStock.length === 0 && <EmptyState message="Все материалы в норме" />}
        {lowStock.map((m) => (
          <Link
            key={m.id}
            href={`/materials/${m.id}`}
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{m.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatQuantity(m.quantity, m.unit)} · норма {formatQuantity(m.minStock, m.unit)}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StockStatusBadge status={getStockStatus(m.quantity, m.minStock)} />
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

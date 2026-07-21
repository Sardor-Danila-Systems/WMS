"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Package, ShieldAlert } from "lucide-react";
import { useWarehouseStore } from "@/store/warehouse-store";
import { getStockStatus } from "@/constants/colors";
import { StockStatusBadge, OperationTypeBadge } from "@/shared/components/status-badge";
import { EmptyState } from "@/shared/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatQuantity } from "@/lib/format";
import { MaterialHistoryChart } from "./material-history-chart";
import type { Operation, OperationType } from "@/types";

function OperationMiniList({ title, operations }: { title: ReactNode; operations: Operation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {operations.length === 0 && <EmptyState message="Пока нет операций" />}
        {operations.map((op) => (
          <div key={op.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60">
            <div className="min-w-0">
              <div className="font-medium tabular-nums">{formatQuantity(op.quantity, op.unit)}</div>
              <div className="truncate text-xs text-muted-foreground">{op.counterpartyName}</div>
            </div>
            <div className="shrink-0 text-xs text-muted-foreground">{formatDateTime(op.date)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function MaterialDetailView({ materialId }: { materialId: string }) {
  const materials = useWarehouseStore((s) => s.materials);
  const operations = useWarehouseStore((s) => s.operations);
  const material = materials.find((m) => m.id === materialId);

  const byType = useMemo(() => {
    if (!material) return {} as Record<OperationType, Operation[]>;
    const own = operations.filter((op) => op.materialId === material.id);
    return {
      receipt: own.filter((op) => op.type === "receipt").slice(0, 5),
      issue: own.filter((op) => op.type === "issue").slice(0, 5),
      return: own.filter((op) => op.type === "return").slice(0, 5),
    };
  }, [operations, material]);

  if (!material) {
    notFound();
  }

  const status = getStockStatus(material.quantity, material.minStock);

  return (
    <div className="space-y-6">
      <Link href="/materials" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Назад к материалам
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{material.name}</h2>
            <StockStatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{material.category}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Текущий остаток</div>
              <div className="text-xl font-semibold tabular-nums">{formatQuantity(material.quantity, material.unit)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Минимальный остаток</div>
              <div className="text-xl font-semibold tabular-nums">{formatQuantity(material.minStock, material.unit)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Последнее поступление</div>
              <div className="text-xl font-semibold">
                {material.lastReceiptDate ? formatDate(material.lastReceiptDate) : "—"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Динамика остатка за 30 дней</CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialHistoryChart material={material} operations={operations} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <OperationMiniList title={<OperationTypeBadge type="receipt" />} operations={byType.receipt ?? []} />
        <OperationMiniList title={<OperationTypeBadge type="issue" />} operations={byType.issue ?? []} />
        <OperationMiniList title={<OperationTypeBadge type="return" />} operations={byType.return ?? []} />
      </div>
    </div>
  );
}

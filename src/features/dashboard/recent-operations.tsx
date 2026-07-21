"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useWarehouseStore } from "@/store/warehouse-store";
import { getRecentOperations } from "@/store/selectors";
import { OperationTypeBadge } from "@/shared/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatQuantity } from "@/lib/format";

export function RecentOperations() {
  const operations = useWarehouseStore((s) => s.operations);
  const workers = useWarehouseStore((s) => s.workers);
  const recent = useMemo(() => getRecentOperations(operations, 8), [operations]);
  const workerName = (id: string) => workers.find((w) => w.id === id)?.name ?? "—";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Последние операции</CardTitle>
        <Link href="/history" className="text-xs text-primary hover:underline">
          Вся история
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {recent.map((op) => (
          <div key={op.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
            <OperationTypeBadge type={op.type} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{op.materialName}</div>
              <div className="truncate text-xs text-muted-foreground">
                {formatQuantity(op.quantity, op.unit)} · {workerName(op.workerId)}
              </div>
            </div>
            <div className="shrink-0 text-xs text-muted-foreground">{formatDateTime(op.date)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

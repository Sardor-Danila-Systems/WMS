import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, HardHat, PackageCheck, TrendingDown } from "lucide-react";

import { getCurrentUser, roleCan } from "@/lib/auth/dal";
import {
  countMaterialMovements,
  getMaterial,
  getMaterialBalanceHistory,
  getMaterialHolders,
  getMaterialTotals,
  listMovements,
} from "@/server/queries";
import { getStockStatus } from "@/constants/colors";
import { formatNumber, formatQuantity } from "@/lib/format";
import { StatCard } from "@/shared/components/stat-card";
import { StockStatusBadge } from "@/shared/components/status-badge";
import { EmptyState } from "@/shared/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialBalanceChart } from "@/features/materials/material-balance-chart";
import { MaterialFormDialog } from "@/features/materials/material-form-dialog";
import { MaterialDeleteButton } from "@/features/materials/material-actions";
import { MovementsTable } from "@/features/operations/movements-table";

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const material = getMaterial(id);
  if (!material) notFound();

  const user = await getCurrentUser();
  const movementCount = countMaterialMovements(id);
  const totals = getMaterialTotals(id);
  const holders = getMaterialHolders(id);
  const movements = listMovements({ materialId: id });
  const balanceHistory = getMaterialBalanceHistory(id, 30);
  const status = getStockStatus(material.quantity, material.minStock);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/materials"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Все материалы
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{material.name}</h2>
              <StockStatusBadge status={status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {material.category} · единица измерения: {material.unit}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <MaterialFormDialog material={material} hasHistory={movementCount > 0} />
            {user && roleCan(user.role, "material:delete") && (
              <MaterialDeleteButton material={material} movementCount={movementCount} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="На складе"
          value={formatQuantity(material.quantity, material.unit)}
          icon={Boxes}
          hint={`Минимум: ${formatNumber(material.minStock)} ${material.unit}`}
          color={status === "critical" ? "red" : status === "warning" ? "amber" : "indigo"}
        />
        <StatCard
          label="На руках у бригад"
          value={formatQuantity(material.atForemen, material.unit)}
          icon={HardHat}
          hint={holders.length > 0 ? `${holders.length} бригадир(ов)` : "Ни у кого не числится"}
          color="orange"
        />
        <StatCard
          label="Всего принято"
          value={formatQuantity(totals.received, material.unit)}
          icon={PackageCheck}
          hint="За всё время"
          color="blue"
        />
        <StatCard
          label="Израсходовано"
          value={formatQuantity(totals.used, material.unit)}
          icon={TrendingDown}
          hint={`Возвращено: ${formatQuantity(totals.returned, material.unit)}`}
          color="teal"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MaterialBalanceChart data={balanceHistory} unit={material.unit} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Сейчас на руках</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {holders.length === 0 && (
              <EmptyState
                message="Материал полностью на складе"
                description="Ни за одним бригадиром этот материал не числится"
              />
            )}
            {holders.map((holder) => (
              <Link
                key={holder.foremanId}
                href={`/foremen/${holder.foremanId}`}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{holder.foremanName}</div>
                  <div className="truncate text-xs text-muted-foreground">{holder.brigade}</div>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatQuantity(holder.quantity, material.unit)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">История движения материала</h3>
        <MovementsTable
          movements={movements}
          columns={["type", "date", "quantity", "delta", "stockAfter", "foreman", "supplier", "project", "user"]}
          pageSize={10}
          emptyMessage="По материалу ещё не было операций"
          exportName={`dvizhenie-${material.name}`}
        />
      </div>
    </div>
  );
}

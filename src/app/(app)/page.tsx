import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  HardHat,
  Package,
  TruckIcon,
} from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { StatCard } from "@/shared/components/stat-card";
import { EmptyState } from "@/shared/components/empty-state";
import { MovementTypeBadge, StockStatusBadge } from "@/shared/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityChart } from "@/features/dashboard/activity-chart";
import { OperationDialog } from "@/features/operations/operation-dialog";
import { getDashboardData, type PeriodTotals } from "@/server/queries";
import { getOperationRefData } from "@/server/ref-data";
import { getStockStatus, MOVEMENT_META } from "@/constants/colors";
import type { MovementType } from "@/types";
import { declOf, formatDateTime, formatQuantity } from "@/lib/format";

/** Порядок соответствует движению материала: пришло → выдали → израсходовали → вернули. */
const TODAY_BREAKDOWN: { type: MovementType; count: (t: PeriodTotals) => number }[] = [
  { type: "RECEIPT", count: (t) => t.receiptCount },
  { type: "ISSUE", count: (t) => t.issueCount },
  { type: "USAGE", count: (t) => t.usageCount },
  { type: "RETURN", count: (t) => t.returnCount },
];

export default async function DashboardPage() {
  const data = getDashboardData();
  const refData = getOperationRefData();

  const todayTotal =
    data.today.receiptCount + data.today.issueCount + data.today.usageCount + data.today.returnCount;
  const weekTotal =
    data.week.receiptCount + data.week.issueCount + data.week.usageCount + data.week.returnCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Дашборд"
        description="Состояние склада на сегодня"
        actions={
          <>
            <OperationDialog type="RECEIPT" data={refData} variant="outline" />
            <OperationDialog type="ISSUE" data={refData} />
          </>
        }
      />

      {/* Четыре показателя отвечают на вопрос «что со складом прямо сейчас».
          Количества разных материалов намеренно не суммируются: тонны, штуки
          и литры нельзя сложить в одно осмысленное число, поэтому итоги
          показываются в позициях и операциях. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Материалов на складе"
          value={String(data.materialsCount)}
          icon={Package}
          hint="Наименований в каталоге"
          color="indigo"
        />
        <StatCard
          label="Требуют пополнения"
          value={String(data.lowStockMaterials.length)}
          icon={AlertTriangle}
          hint={
            data.lowStockMaterials.length > 0
              ? "Остаток опустился до минимума"
              : "Все позиции в норме"
          }
          color={data.lowStockMaterials.length > 0 ? "red" : "slate"}
        />
        <StatCard
          label="На руках у бригад"
          value={`${data.foremanPositions} ${declOf(data.foremanPositions, "позиция", "позиции", "позиций")}`}
          icon={HardHat}
          hint={`У ${data.foremenWithStock} из ${data.foremenCount} бригадиров · ${data.projectsCount} объектов`}
          color="orange"
        />
        <StatCard
          label="Операций сегодня"
          value={String(todayTotal)}
          icon={TruckIcon}
          hint={`За неделю: ${weekTotal}`}
          color="blue"
        />
      </div>

      {/* Движение за сегодня — одной компактной строкой вместо четырёх карточек. */}
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-xs font-medium text-muted-foreground">Движение за сегодня</span>
          {TODAY_BREAKDOWN.map((item) => (
            <span key={item.type} className="flex items-center gap-1.5 text-sm">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: MOVEMENT_META[item.type].color }}
              />
              <span className="text-muted-foreground">{MOVEMENT_META[item.type].label}:</span>
              <span className="font-semibold tabular-nums">{item.count(data.today)}</span>
            </span>
          ))}
        </div>
      </div>

      <ActivityChart data={data.activity} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Требуют пополнения</CardTitle>
            <Link
              href="/materials?filter=low-stock"
              className="text-xs text-primary transition-colors hover:underline"
            >
              Все материалы
            </Link>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {data.lowStockMaterials.length === 0 && (
              <EmptyState
                message="Все материалы в норме"
                description="Ни одна позиция не опустилась до минимального остатка"
              />
            )}
            {data.lowStockMaterials.slice(0, 6).map((material) => (
              <Link
                key={material.id}
                href={`/materials/${material.id}`}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{material.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatQuantity(material.quantity, material.unit)} · минимум{" "}
                    {formatQuantity(material.minStock, material.unit)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StockStatusBadge status={getStockStatus(material.quantity, material.minStock)} />
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Последние операции</CardTitle>
            <Link href="/history" className="text-xs text-primary transition-colors hover:underline">
              Вся история
            </Link>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {data.recentMovements.length === 0 && (
              <EmptyState message="Операций ещё не было" description="Оформите первое поступление на склад" />
            )}
            {data.recentMovements.map((movement) => (
              <div
                key={movement.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
              >
                <MovementTypeBadge type={movement.type} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{movement.materialName}</div>
                  {/* Подписываем контрагента: иначе непонятно, чьё это имя —
                      бригадира, поставщика или сотрудника склада. */}
                  <div className="truncate text-xs text-muted-foreground">
                    {formatQuantity(movement.quantity, movement.unit)}
                    {movement.supplierName && ` · от ${movement.supplierName}`}
                    {movement.foremanName && ` · бригадир ${movement.foremanName}`}
                    {movement.projectName && ` · ${movement.projectName}`}
                  </div>
                </div>
                <div className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateTime(movement.occurredAt)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

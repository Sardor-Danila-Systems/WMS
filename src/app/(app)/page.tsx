import Link from "next/link";
import { AlertTriangle, Blocks, ChevronRight, Coins, Package, TruckIcon } from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { StatCard } from "@/shared/components/stat-card";
import { EmptyState } from "@/shared/components/empty-state";
import { MovementTypeBadge, StockStatusBadge } from "@/shared/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityChart } from "@/features/dashboard/activity-chart";
import { OperationDialog } from "@/features/operations/operation-dialog";
import { getDashboardData, type PeriodTotals } from "@/server/queries";
import { getOperationRefData } from "@/server/ref-data";
import { getStockStatus, MOVEMENT_COLORS, MOVEMENT_TYPES } from "@/constants/colors";
import { getIntlTag, getT, getValueTranslator } from "@/i18n/server";
import { formatDate, formatMoney, formatMoneyCompact, formatQuantity } from "@/lib/format";
import type { MovementType } from "@/types";

/** Порядок соответствует движению материала: пришло → ушло в блок → вернулось. */
const TODAY_COUNT: Record<MovementType, (t: PeriodTotals) => number> = {
  RECEIPT: (t) => t.receiptCount,
  ISSUE: (t) => t.issueCount,
  RETURN: (t) => t.returnCount,
};

const TODAY_AMOUNT: Record<MovementType, (t: PeriodTotals) => number> = {
  RECEIPT: (t) => t.receiptAmount,
  ISSUE: (t) => t.issueAmount,
  RETURN: (t) => t.returnAmount,
};

export default async function DashboardPage() {
  const [t, locale, data, refData] = await Promise.all([
    getT(),
    getIntlTag(),
    getDashboardData(),
    getOperationRefData(),
  ]);
  const unitLabel = await getValueTranslator("units");

  const total = (totals: PeriodTotals) =>
    totals.receiptCount + totals.issueCount + totals.returnCount;
  const unitOf = (unit: string) => unitLabel(unit);
  const currency = t("money.currency");
  const compactSuffixes = {
    thousand: t("money.thousand"),
    million: t("money.million"),
    billion: t("money.billion"),
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.subtitle")}
        actions={
          <>
            <OperationDialog type="RECEIPT" data={refData} variant="outline" />
            <OperationDialog type="ISSUE" data={refData} />
          </>
        }
      />

      {/* Количества разных материалов намеренно не суммируются: тонны, штуки
          и литры нельзя сложить в одно осмысленное число. Сопоставимый итог
          по всему складу даёт только сумма в деньгах. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label={t("dashboard.materialsCount")}
          value={String(data.materialsCount)}
          icon={Package}
          hint={t("dashboard.materialsHint")}
          tone="accent"
        />
        <StatCard
          label={t("money.warehouseValue")}
          value={`${formatMoneyCompact(data.warehouseValue, compactSuffixes, locale)} ${currency}`}
          icon={Coins}
          hint={t("money.warehouseValueHint")}
          tone="positive"
        />
        <StatCard
          label={t("dashboard.lowStock")}
          value={String(data.lowStockMaterials.length)}
          icon={AlertTriangle}
          hint={
            data.lowStockMaterials.length > 0 ? t("dashboard.lowStockHint") : t("dashboard.lowStockOk")
          }
          tone={data.lowStockMaterials.length > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label={t("dashboard.atBlocks")}
          value={t("dashboard.positions", { count: data.blockPositions })}
          icon={Blocks}
          hint={t("dashboard.atBlocksHint", {
            withStock: data.blocksWithStock,
            total: data.blocksCount,
            organizations: data.organizationsCount,
          })}
          tone="warning"
        />
        <StatCard
          label={t("dashboard.todayOps")}
          value={String(total(data.today))}
          icon={TruckIcon}
          hint={t("dashboard.weekOps", { n: total(data.week) })}
          tone="neutral"
        />
      </div>

      {/* Движение за сегодня — одной компактной строкой вместо трёх карточек. */}
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-[12.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
            {t("dashboard.todayMovement")}
          </span>
          {MOVEMENT_TYPES.map((type) => (
            <span key={type} className="flex items-center gap-1.5 text-[14.5px]">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: MOVEMENT_COLORS[type].color }}
              />
              <span className="text-muted-foreground">{t(`movements.${type}`)}</span>
              <span className="font-semibold tabular-nums">{TODAY_COUNT[type](data.today)}</span>
              {TODAY_AMOUNT[type](data.today) > 0 && (
                <span className="tabular-nums text-muted-foreground">
                  · {formatMoneyCompact(TODAY_AMOUNT[type](data.today), compactSuffixes, locale)}{" "}
                  {currency}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      <ActivityChart data={data.activity} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[14.5px] font-semibold">{t("dashboard.lowStockCard")}</CardTitle>
            <Link
              href="/materials?filter=low-stock"
              className="text-[13px] text-primary transition-colors hover:underline"
            >
              {t("dashboard.allMaterials")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {data.lowStockMaterials.length === 0 && (
              <EmptyState message={t("dashboard.allGood")} description={t("dashboard.allGoodHint")} />
            )}
            {data.lowStockMaterials.slice(0, 6).map((material) => (
              <Link
                key={material.id}
                href={`/materials/${material.id}`}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-medium">{material.name}</div>
                  <div className="text-[13px] text-muted-foreground">
                    {formatQuantity(material.quantity, unitOf(material.unit), locale)} ·{" "}
                    {t("dashboard.minimum")}{" "}
                    {formatQuantity(material.minStock, unitOf(material.unit), locale)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StockStatusBadge status={getStockStatus(material.quantity, material.minStock)} />
                  <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[14.5px] font-semibold">{t("dashboard.recentOps")}</CardTitle>
            <Link href="/history" className="text-[13px] text-primary transition-colors hover:underline">
              {t("dashboard.fullHistory")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {data.recentMovements.length === 0 && (
              <EmptyState
                message={t("dashboard.noRecentOps")}
                description={t("dashboard.noRecentOpsHint")}
              />
            )}
            {data.recentMovements.map((movement) => (
              <div
                key={movement.id}
                className="flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-muted/60"
              >
                <MovementTypeBadge type={movement.type} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-medium">{movement.materialName}</div>
                  {/* Подписываем контрагента: иначе непонятно, чьё это имя —
                      блока, поставщика или сотрудника склада. */}
                  <div className="truncate text-[13px] text-muted-foreground">
                    {formatQuantity(movement.quantity, unitOf(movement.unit), locale)}
                    {movement.amount > 0 && ` · ${formatMoney(movement.amount, locale)} ${currency}`}
                    {movement.supplierName &&
                      ` · ${t("dashboard.fromSupplier", { name: movement.supplierName })}`}
                    {movement.blockName &&
                      ` · ${t("dashboard.blockLabel", { name: movement.blockName })}`}
                  </div>
                </div>
                <div className="shrink-0 whitespace-nowrap text-[13px] text-muted-foreground">
                  {formatDate(movement.occurredAt, locale)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Blocks, Boxes, Coins, PackageCheck, TrendingDown } from "lucide-react";

import { getCurrentUser, roleCan } from "@/lib/auth/dal";
import {
  countMaterialMovements,
  getMaterial,
  getMaterialBalanceHistory,
  getMaterialHolders,
  getMaterialPriceHistory,
  getMaterialTotals,
  listMovements,
} from "@/server/queries";
import { getStockStatus } from "@/constants/colors";
import { getIntlTag, getT, getValueTranslator } from "@/i18n/server";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
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
  const material = await getMaterial(id);
  if (!material) notFound();

  const [t, locale, user, movementCount, totals, holders, movements, balanceHistory, priceHistory] =
    await Promise.all([
      getT(),
      getIntlTag(),
      getCurrentUser(),
      countMaterialMovements(id),
      getMaterialTotals(id),
      getMaterialHolders(id),
      listMovements({ materialId: id }),
      getMaterialBalanceHistory(id, 30),
      getMaterialPriceHistory(id),
    ]);
  const unitLabel = await getValueTranslator("units");
  const categoryLabel = await getValueTranslator("categories");

  const status = getStockStatus(material.quantity, material.minStock);
  const unit = unitLabel(material.unit);
  const currency = t("money.currency");
  const qty = (value: number) => formatQuantity(value, unit, locale);
  const money = (value: number) => `${formatMoney(value, locale)} ${currency}`;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/materials"
          className="mb-3 inline-flex items-center gap-1.5 text-[14.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("materials.allMaterials")}
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-semibold tracking-tight sm:text-[22px]">
                {material.name}
              </h2>
              <StockStatusBadge status={status} />
            </div>
            <p className="mt-1 text-[14.5px] text-muted-foreground">
              {categoryLabel(material.category)} · {t("materials.detail.unitLabel")}: {unit}
              {material.price > 0 && ` · ${money(material.price)} / ${unit}`}
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label={t("materials.detail.inStock")}
          value={qty(material.quantity)}
          icon={Boxes}
          hint={t("materials.detail.minimumIs", { value: qty(material.minStock) })}
          tone={status === "critical" ? "danger" : status === "warning" ? "warning" : "accent"}
        />
        <StatCard
          label={t("materials.detail.stockValue")}
          value={money(material.quantity * material.price)}
          icon={Coins}
          hint={
            material.price > 0
              ? `${t("money.currentPrice")}: ${money(material.price)}`
              : t("money.noPrice")
          }
          tone="neutral"
        />
        <StatCard
          label={t("materials.detail.atBlocks")}
          value={qty(material.atBlocks)}
          icon={Blocks}
          hint={
            holders.length > 0
              ? t("materials.detail.blocksCount", { n: holders.length })
              : t("materials.detail.nobody")
          }
          tone="warning"
        />
        <StatCard
          label={t("materials.detail.totalReceived")}
          value={qty(totals.received)}
          icon={PackageCheck}
          hint={money(totals.receivedAmount)}
          tone="neutral"
        />
        <StatCard
          label={t("materials.detail.issued")}
          value={qty(totals.issued)}
          icon={TrendingDown}
          hint={t("materials.detail.returned", { value: qty(totals.returned) })}
          tone="neutral"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MaterialBalanceChart data={balanceHistory} unit={unit} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-[14.5px] font-semibold">
              {t("materials.detail.holders")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {holders.length === 0 && (
              <EmptyState
                message={t("materials.detail.noHolders")}
                description={t("materials.detail.noHoldersHint")}
              />
            )}
            {holders.map((holder) => (
              <Link
                key={holder.blockId}
                href={`/blocks/${holder.blockId}`}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-medium">{holder.blockName}</div>
                  <div className="truncate text-[13px] text-muted-foreground">
                    {holder.description || "—"}
                  </div>
                </div>
                <span className="shrink-0 text-[14.5px] font-medium tabular-nums">
                  {qty(holder.quantity)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14.5px] font-semibold">{t("money.priceHistory")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0.5">
          {priceHistory.length === 0 && <EmptyState message={t("money.noPriceHistory")} />}
          {priceHistory.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[14.5px]"
            >
              <span className="whitespace-nowrap text-muted-foreground">
                {formatDate(entry.occurredAt, locale)}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {entry.supplierName ?? ""}
              </span>
              <span className="shrink-0 font-medium tabular-nums">{money(entry.unitPrice)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2.5 text-[14.5px] font-semibold">{t("materials.detail.history")}</h3>
        <MovementsTable
          movements={movements}
          columns={[
            "type",
            "date",
            "quantity",
            "price",
            "amount",
            "delta",
            "stockAfter",
            "block",
            "supplier",
            "user",
          ]}
          pageSize={10}
          emptyMessage={t("materials.detail.noHistory")}
          exportName={`material-${material.name}`}
        />
      </div>
    </div>
  );
}

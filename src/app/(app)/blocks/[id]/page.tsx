import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpFromLine, Boxes, Coins, Undo2 } from "lucide-react";

import {
  getBlock,
  getBlockMaterialTotals,
  getBlockStock,
  getBlockSummaries,
  listMovements,
  listOrganizations,
} from "@/server/queries";
import { getIntlTag, getT, getValueTranslator } from "@/i18n/server";
import { formatMoney, formatQuantity } from "@/lib/format";
import { StatCard } from "@/shared/components/stat-card";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BlockFormDialog } from "@/features/blocks/block-form-dialog";
import { MovementsTable } from "@/features/operations/movements-table";
import { OperationDialog } from "@/features/operations/operation-dialog";
import { getOperationRefData } from "@/server/ref-data";

export default async function BlockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const block = await getBlock(id);
  if (!block) notFound();

  const [t, locale, stock, materialTotals, summaries, movements, refData, organizations] =
    await Promise.all([
      getT(),
      getIntlTag(),
      getBlockStock(id),
      getBlockMaterialTotals(id),
      getBlockSummaries(),
      listMovements({ blockId: id }),
      getOperationRefData(),
      listOrganizations(),
    ]);
  const unitLabel = await getValueTranslator("units");

  const summary = summaries.get(id);
  const unitOf = (unit: string) => unitLabel(unit);
  const currency = t("money.currency");

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/blocks"
          className="mb-3 inline-flex items-center gap-1.5 text-[14.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("blocks.all")}
        </Link>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-semibold tracking-tight sm:text-[22px]">{block.name}</h2>
              {!block.isActive && <Badge variant="outline">{t("blocks.inactive")}</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14.5px] text-muted-foreground">
              {block.description && <span>{block.description}</span>}
              {block.organizationName && <span>· {block.organizationName}</span>}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <OperationDialog type="ISSUE" data={refData} variant="outline" />
            <OperationDialog type="RETURN" data={refData} variant="outline" />
            <BlockFormDialog block={block} organizations={organizations} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t("blocks.detail.positionsOnHand")}
          value={String(stock.length)}
          icon={Boxes}
          hint={stock.length > 0 ? t("blocks.detail.needsAction") : t("blocks.detail.allClosed")}
          tone={stock.length > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label={t("blocks.issueCount")}
          value={String(summary?.issueCount ?? 0)}
          icon={ArrowUpFromLine}
          hint={t("blocks.detail.issuedHint")}
          tone="accent"
        />
        <StatCard
          label={t("blocks.returnCount")}
          value={String(summary?.returnCount ?? 0)}
          icon={Undo2}
          hint={t("blocks.detail.returnedHint")}
          tone="neutral"
        />
        <StatCard
          label={t("blocks.amount")}
          value={`${formatMoney(summary?.amount ?? 0, locale)} ${currency}`}
          icon={Coins}
          hint={t("blocks.detail.amountHint")}
          tone="neutral"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14.5px] font-semibold">
            {t("blocks.detail.materialsTitle")}
          </CardTitle>
          <CardDescription className="text-[13px]">{t("blocks.detail.materialsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {materialTotals.length === 0 ? (
            <EmptyState
              message={t("blocks.detail.noMaterials")}
              description={t("blocks.detail.noMaterialsHint")}
            />
          ) : (
            <>
              {/* Телефон: список вместо широкой таблицы */}
              <div className="divide-y divide-border md:hidden">
                {materialTotals.map((row) => (
                  <div key={row.materialId} className="px-4 py-3">
                    <Link
                      href={`/materials/${row.materialId}`}
                      className="text-[14.5px] font-medium hover:underline"
                    >
                      {row.materialName}
                    </Link>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
                      <dt className="text-muted-foreground">{t("blocks.detail.issued")}</dt>
                      <dd className="text-right tabular-nums">
                        {formatQuantity(row.issued, unitOf(row.unit), locale)}
                      </dd>
                      <dt className="text-muted-foreground">{t("blocks.detail.returned")}</dt>
                      <dd className="text-right tabular-nums">
                        {formatQuantity(row.returned, unitOf(row.unit), locale)}
                      </dd>
                      <dt className="text-muted-foreground">{t("blocks.detail.amount")}</dt>
                      <dd className="text-right tabular-nums">
                        {formatMoney(row.amount, locale)} {currency}
                      </dd>
                      <dt className="font-medium">{t("blocks.detail.onHand")}</dt>
                      <dd
                        className={
                          row.onHand > 0
                            ? "text-right font-semibold tabular-nums text-[#9c4d16]"
                            : "text-right tabular-nums text-muted-foreground"
                        }
                      >
                        {formatQuantity(row.onHand, unitOf(row.unit), locale)}
                      </dd>
                    </dl>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[12.5px] font-medium uppercase text-muted-foreground">
                        {t("operations.material")}
                      </TableHead>
                      <TableHead className="text-right text-[12.5px] font-medium uppercase text-muted-foreground">
                        {t("blocks.detail.issued")}
                      </TableHead>
                      <TableHead className="text-right text-[12.5px] font-medium uppercase text-muted-foreground">
                        {t("blocks.detail.returned")}
                      </TableHead>
                      <TableHead className="text-right text-[12.5px] font-medium uppercase text-muted-foreground">
                        {t("blocks.detail.onHand")}
                      </TableHead>
                      <TableHead className="text-right text-[12.5px] font-medium uppercase text-muted-foreground">
                        {t("blocks.detail.amount")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialTotals.map((row) => (
                      <TableRow key={row.materialId} className="text-[14.5px]">
                        <TableCell>
                          <Link href={`/materials/${row.materialId}`} className="font-medium hover:underline">
                            {row.materialName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantity(row.issued, unitOf(row.unit), locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatQuantity(row.returned, unitOf(row.unit), locale)}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.onHand > 0 ? (
                            <span className="font-semibold tabular-nums text-[#9c4d16]">
                              {formatQuantity(row.onHand, unitOf(row.unit), locale)}
                            </span>
                          ) : (
                            <span className="tabular-nums text-muted-foreground">
                              {formatQuantity(0, unitOf(row.unit), locale)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(row.amount, locale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2.5 text-[14.5px] font-semibold">{t("blocks.detail.history")}</h3>
        <MovementsTable
          movements={movements}
          columns={["type", "date", "material", "quantity", "amount", "user", "reason", "comment"]}
          pageSize={10}
          emptyMessage={t("blocks.detail.noHistory")}
          exportName={`blok-${block.name}`}
        />
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, Hammer, PackageMinus, Phone, Undo2 } from "lucide-react";

import {
  getForeman,
  getForemanMaterialTotals,
  getForemanStock,
  getForemenSummaries,
  listMovements,
  listProjects,
} from "@/server/queries";
import { getDictionary, getLocale } from "@/i18n/server";
import { translateValue } from "@/i18n";
import { formatQuantity } from "@/lib/format";
import { StatCard } from "@/shared/components/stat-card";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ForemanFormDialog } from "@/features/foremen/foreman-form-dialog";
import { MovementsTable } from "@/features/operations/movements-table";
import { OperationDialog } from "@/features/operations/operation-dialog";
import { getOperationRefData } from "@/server/ref-data";

export default async function ForemanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const foreman = await getForeman(id);
  if (!foreman) notFound();

  const [t, locale, stock, materialTotals, summaries, movements, refData, projects] =
    await Promise.all([
      getDictionary(),
      getLocale(),
      getForemanStock(id),
      getForemanMaterialTotals(id),
      getForemenSummaries(),
      listMovements({ foremanId: id }),
      getOperationRefData(),
      listProjects(),
    ]);

  const summary = summaries.get(id);
  const unitOf = (unit: string) => translateValue(t.units, unit);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/foremen"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.foremen.all}
        </Link>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-semibold tracking-tight sm:text-[19px]">{foreman.name}</h2>
              {!foreman.isActive && <Badge variant="outline">{t.foremen.inactive}</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted-foreground">
              {foreman.brigade && <span>{foreman.brigade}</span>}
              {foreman.projectName && <span>· {foreman.projectName}</span>}
              {foreman.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {foreman.phone}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <OperationDialog type="ISSUE" data={refData} variant="outline" />
            <OperationDialog type="USAGE" data={refData} variant="outline" />
            <OperationDialog type="RETURN" data={refData} variant="outline" />
            <ForemanFormDialog foreman={foreman} projects={projects} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t.foremen.detail.positionsOnHand}
          value={String(stock.length)}
          icon={Boxes}
          hint={stock.length > 0 ? t.foremen.detail.needsAction : t.foremen.detail.allClosed}
          tone={stock.length > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label={t.foremen.issueCount}
          value={String(summary?.issueCount ?? 0)}
          icon={PackageMinus}
          hint={t.foremen.detail.issuedHint}
          tone="accent"
        />
        <StatCard
          label={t.foremen.usageCount}
          value={String(summary?.usageCount ?? 0)}
          icon={Hammer}
          hint={t.foremen.detail.usedHint}
          tone="neutral"
        />
        <StatCard
          label={t.foremen.returnCount}
          value={String(summary?.returnCount ?? 0)}
          icon={Undo2}
          hint={t.foremen.detail.returnedHint}
          tone="neutral"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[13px] font-semibold">
            {t.foremen.detail.materialsTitle}
          </CardTitle>
          <CardDescription className="text-xs">{t.foremen.detail.materialsHint}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {materialTotals.length === 0 ? (
            <EmptyState
              message={t.foremen.detail.noMaterials}
              description={t.foremen.detail.noMaterialsHint}
            />
          ) : (
            <>
              {/* Телефон: список вместо широкой таблицы */}
              <div className="divide-y divide-border md:hidden">
                {materialTotals.map((row) => (
                  <div key={row.materialId} className="px-4 py-3">
                    <Link
                      href={`/materials/${row.materialId}`}
                      className="text-[13px] font-medium hover:underline"
                    >
                      {row.materialName}
                    </Link>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">{t.foremen.detail.received}</dt>
                      <dd className="text-right tabular-nums">
                        {formatQuantity(row.received, unitOf(row.unit), locale)}
                      </dd>
                      <dt className="text-muted-foreground">{t.foremen.detail.used}</dt>
                      <dd className="text-right tabular-nums">
                        {formatQuantity(row.used, unitOf(row.unit), locale)}
                      </dd>
                      <dt className="text-muted-foreground">{t.foremen.detail.returned}</dt>
                      <dd className="text-right tabular-nums">
                        {formatQuantity(row.returned, unitOf(row.unit), locale)}
                      </dd>
                      <dt className="font-medium">{t.foremen.detail.onHand}</dt>
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
                      <TableHead className="text-[11px] font-medium uppercase text-muted-foreground">
                        {t.operations.material}
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-medium uppercase text-muted-foreground">
                        {t.foremen.detail.received}
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-medium uppercase text-muted-foreground">
                        {t.foremen.detail.used}
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-medium uppercase text-muted-foreground">
                        {t.foremen.detail.returned}
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-medium uppercase text-muted-foreground">
                        {t.foremen.detail.onHand}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialTotals.map((row) => (
                      <TableRow key={row.materialId} className="text-[13px]">
                        <TableCell>
                          <Link href={`/materials/${row.materialId}`} className="font-medium hover:underline">
                            {row.materialName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantity(row.received, unitOf(row.unit), locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatQuantity(row.used, unitOf(row.unit), locale)}
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
        <h3 className="mb-2.5 text-[13px] font-semibold">{t.foremen.detail.history}</h3>
        <MovementsTable
          movements={movements}
          columns={["type", "date", "material", "quantity", "project", "user", "reason", "comment"]}
          pageSize={10}
          emptyMessage={t.foremen.detail.noHistory}
          exportName={`brigadir-${foreman.name}`}
        />
      </div>
    </div>
  );
}

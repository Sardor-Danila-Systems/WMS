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
  const foreman = getForeman(id);
  if (!foreman) notFound();

  const stock = getForemanStock(id);
  const materialTotals = getForemanMaterialTotals(id);
  const summary = getForemenSummaries().get(id);
  const movements = listMovements({ foremanId: id });
  const refData = getOperationRefData();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/foremen"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Все бригадиры
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{foreman.name}</h2>
              {!foreman.isActive && <Badge variant="outline">Неактивен</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
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
            <ForemanFormDialog foreman={foreman} projects={listProjects()} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Позиций на руках"
          value={String(stock.length)}
          icon={Boxes}
          hint={stock.length > 0 ? "Требуют списания или возврата" : "Всё закрыто"}
          color={stock.length > 0 ? "orange" : "slate"}
        />
        <StatCard
          label="Выдач"
          value={String(summary?.issueCount ?? 0)}
          icon={PackageMinus}
          hint="Получал материал со склада"
          color="blue"
        />
        <StatCard
          label="Списаний"
          value={String(summary?.usageCount ?? 0)}
          icon={Hammer}
          hint="Израсходовано на объектах"
          color="teal"
        />
        <StatCard
          label="Возвратов"
          value={String(summary?.returnCount ?? 0)}
          icon={Undo2}
          hint="Сдано обратно на склад"
          color="violet"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Материалы по бригадиру</CardTitle>
          <CardDescription className="text-xs">
            Сколько получил, сколько израсходовал, сколько вернул и сколько осталось на руках
          </CardDescription>
        </CardHeader>
        <CardContent>
          {materialTotals.length === 0 ? (
            <EmptyState
              message="Бригадиру ещё не выдавали материалов"
              description="Оформите выдачу — и здесь появится расход по каждому материалу"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground">Материал</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Получено</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Использовано</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Возвращено</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">На руках</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialTotals.map((row) => (
                    <TableRow key={row.materialId}>
                      <TableCell>
                        <Link href={`/materials/${row.materialId}`} className="font-medium hover:underline">
                          {row.materialName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQuantity(row.received, row.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatQuantity(row.used, row.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatQuantity(row.returned, row.unit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.onHand > 0 ? (
                          <span className="font-semibold tabular-nums text-orange-700">
                            {formatQuantity(row.onHand, row.unit)}
                          </span>
                        ) : (
                          <span className="tabular-nums text-muted-foreground">0 {row.unit}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-semibold">История операций бригадира</h3>
        <MovementsTable
          movements={movements}
          columns={["type", "date", "material", "quantity", "project", "user", "reason", "comment"]}
          pageSize={10}
          emptyMessage="Операций по бригадиру ещё не было"
          exportName={`brigadir-${foreman.name}`}
        />
      </div>
    </div>
  );
}

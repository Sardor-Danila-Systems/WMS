import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, HardHat, Hammer, MapPin, PackageMinus } from "lucide-react";

import { getCurrentUser, roleCan } from "@/lib/auth/dal";
import {
  getProject,
  getProjectMaterialTotals,
  getProjectSummaries,
  listForemen,
  listMovements,
} from "@/server/queries";
import { formatQuantity } from "@/lib/format";
import { StatCard } from "@/shared/components/stat-card";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProjectFormDialog } from "@/features/projects/project-form-dialog";
import { MovementsTable } from "@/features/operations/movements-table";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const user = await getCurrentUser();
  const summary = getProjectSummaries().get(id);
  const materialTotals = getProjectMaterialTotals(id);
  const movements = listMovements({ projectId: id });
  const foremen = listForemen({ includeInactive: true }).filter((f) => f.projectId === id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Все объекты
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.name}</h2>
              {!project.isActive && <Badge variant="outline">Закрыт</Badge>}
            </div>
            {project.address && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {project.address}
              </p>
            )}
          </div>
          {user && roleCan(user.role, "project:write") && <ProjectFormDialog project={project} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Материалов на объекте"
          value={String(materialTotals.length)}
          icon={PackageMinus}
          hint="Наименований прошло через объект"
          color="orange"
        />
        <StatCard
          label="Операций"
          value={String(summary?.movementCount ?? 0)}
          icon={Hammer}
          hint={`Выдач: ${summary?.issueCount ?? 0} · списаний: ${summary?.usageCount ?? 0}`}
          color="teal"
        />
        <StatCard
          label="Бригад на объекте"
          value={String(foremen.length)}
          icon={HardHat}
          hint={foremen.map((f) => f.name).slice(0, 2).join(", ") || "Бригады не закреплены"}
          color="indigo"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Сколько материалов ушло на объект</CardTitle>
        </CardHeader>
        <CardContent>
          {materialTotals.length === 0 ? (
            <EmptyState
              message="На объект пока ничего не выдавалось"
              description="Здесь появится расход материалов, как только будет оформлена первая выдача"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground">Материал</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">
                      Выдано
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">
                      Израсходовано
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">
                      Осталось у бригад
                    </TableHead>
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
                        {formatQuantity(row.issued, row.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatQuantity(row.used, row.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQuantity(Math.max(0, row.issued - row.used), row.unit)}
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
        <h3 className="mb-3 text-sm font-semibold">Операции по объекту</h3>
        <MovementsTable
          movements={movements}
          columns={["type", "date", "material", "quantity", "foreman", "user", "comment"]}
          pageSize={10}
          emptyMessage="Операций по объекту ещё не было"
          exportName={`obekt-${project.name}`}
        />
      </div>
    </div>
  );
}

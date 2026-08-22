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
import { getIntlTag, getT, getValueTranslator } from "@/i18n/server";
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
  const project = await getProject(id);
  if (!project) notFound();

  const [t, locale, user, summaries, materialTotals, movements, allForemen] = await Promise.all([
    getT(),
    getIntlTag(),
    getCurrentUser(),
    getProjectSummaries(),
    getProjectMaterialTotals(id),
    listMovements({ projectId: id }),
    listForemen({ includeInactive: true }),
  ]);
  const unitLabel = await getValueTranslator("units");

  const summary = summaries.get(id);
  const foremen = allForemen.filter((f) => f.projectId === id);
  const unitOf = (unit: string) => unitLabel(unit);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects"
          className="mb-4 inline-flex items-center gap-1.5 text-[15px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("projects.all")}
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.name}</h2>
              {!project.isActive && <Badge variant="outline">{t("projects.closed")}</Badge>}
            </div>
            {project.address && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-[15px] text-muted-foreground">
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
          label={t("projects.detail.materialsOnSite")}
          value={String(materialTotals.length)}
          icon={PackageMinus}
          hint={t("projects.detail.materialsHint")}
          tone="warning"
        />
        <StatCard
          label={t("projects.operations")}
          value={String(summary?.movementCount ?? 0)}
          icon={Hammer}
          hint={t("projects.detail.operationsHint", { issues: summary?.issueCount ?? 0, usages: summary?.usageCount ?? 0 })}
          tone="neutral"
        />
        <StatCard
          label={t("projects.detail.brigadesOnSite")}
          value={String(foremen.length)}
          icon={HardHat}
          hint={foremen.map((f) => f.name).slice(0, 2).join(", ") || t("projects.detail.noBrigades")}
          tone="accent"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[14.5px] font-semibold">{t("projects.detail.consumptionTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {materialTotals.length === 0 ? (
            <EmptyState
              message={t("projects.detail.noConsumption")}
              description={t("projects.detail.noConsumptionHint")}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[13px] font-medium text-muted-foreground">{t("operations.material")}</TableHead>
                    <TableHead className="text-right text-[13px] font-medium text-muted-foreground">
                      {t("projects.detail.issued")}
                    </TableHead>
                    <TableHead className="text-right text-[13px] font-medium text-muted-foreground">
                      {t("projects.detail.used")}
                    </TableHead>
                    <TableHead className="text-right text-[13px] font-medium text-muted-foreground">
                      {t("projects.detail.remaining")}
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
                        {formatQuantity(row.issued, unitOf(row.unit), locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatQuantity(row.used, unitOf(row.unit), locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQuantity(Math.max(0, row.issued - row.used), unitOf(row.unit), locale)}
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
        <h3 className="mb-2.5 text-[14.5px] font-semibold">{t("projects.detail.history")}</h3>
        <MovementsTable
          movements={movements}
          columns={["type", "date", "material", "quantity", "foreman", "user", "comment"]}
          pageSize={10}
          emptyMessage={t("projects.detail.noHistory")}
          exportName={`obyekt-${project.name}`}
        />
      </div>
    </div>
  );
}

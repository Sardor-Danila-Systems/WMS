"use client";

import { useRouter } from "next/navigation";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import type { Project } from "@/types";
import type { ProjectSummary } from "@/server/queries";

export interface ProjectRowData extends Project {
  summary: ProjectSummary;
}

export function ProjectsTable({ projects }: { projects: ProjectRowData[] }) {
  const router = useRouter();
  const { t, locale } = useI18n();

  const columns: DataTableColumn<ProjectRowData>[] = [
    {
      id: "name",
      header: t.operations.project,
      accessor: (p) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{p.name}</span>
            {!p.isActive && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {t.projects.closed}
              </Badge>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">{p.address || "—"}</div>
        </div>
      ),
      sortValue: (p) => p.name,
    },
    {
      id: "foremen",
      header: t.projects.brigades,
      accessor: (p) => <span className="tabular-nums">{p.summary.foremenCount}</span>,
      sortValue: (p) => p.summary.foremenCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "materials",
      header: t.projects.materialsCount,
      accessor: (p) => <span className="tabular-nums">{p.summary.materialCount}</span>,
      sortValue: (p) => p.summary.materialCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "issued",
      header: t.projects.issues,
      accessor: (p) => <span className="tabular-nums">{p.summary.issueCount}</span>,
      sortValue: (p) => p.summary.issueCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "used",
      header: t.projects.usages,
      accessor: (p) => (
        <span className="tabular-nums text-muted-foreground">{p.summary.usageCount}</span>
      ),
      sortValue: (p) => p.summary.usageCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "movements",
      header: t.projects.operations,
      accessor: (p) => <span className="tabular-nums text-muted-foreground">{p.summary.movementCount}</span>,
      sortValue: (p) => p.summary.movementCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "last",
      header: t.projects.lastOperation,
      accessor: (p) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {p.summary.lastOperationAt ? formatDate(p.summary.lastOperationAt, locale) : "—"}
        </span>
      ),
      sortValue: (p) => (p.summary.lastOperationAt ? new Date(p.summary.lastOperationAt).getTime() : 0),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={projects}
      rowKey={(p) => p.id}
      pageSize={12}
      emptyMessage={t.projects.notFound}
      onRowClick={(p) => router.push(`/projects/${p.id}`)}
      mobileCard={(p) => ({
        title: p.name,
        subtitle: p.address || "—",
        trailing: (
          <div className="text-xs text-muted-foreground">
            {t.projects.operations}: <span className="tabular-nums">{p.summary.movementCount}</span>
          </div>
        ),
      })}
    />
  );
}

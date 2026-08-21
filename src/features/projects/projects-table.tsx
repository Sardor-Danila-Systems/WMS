"use client";

import { useRouter } from "next/navigation";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { Project } from "@/types";
import type { ProjectSummary } from "@/server/queries";

export interface ProjectRowData extends Project {
  summary: ProjectSummary;
}

export function ProjectsTable({ projects }: { projects: ProjectRowData[] }) {
  const router = useRouter();

  const columns: DataTableColumn<ProjectRowData>[] = [
    {
      id: "name",
      header: "Объект",
      accessor: (p) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{p.name}</span>
            {!p.isActive && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Закрыт
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
      header: "Бригад",
      accessor: (p) => <span className="tabular-nums">{p.summary.foremenCount}</span>,
      sortValue: (p) => p.summary.foremenCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "materials",
      header: "Материалов",
      accessor: (p) => <span className="tabular-nums">{p.summary.materialCount}</span>,
      sortValue: (p) => p.summary.materialCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "issued",
      header: "Выдач",
      accessor: (p) => <span className="tabular-nums">{p.summary.issueCount}</span>,
      sortValue: (p) => p.summary.issueCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "used",
      header: "Списаний",
      accessor: (p) => (
        <span className="tabular-nums text-muted-foreground">{p.summary.usageCount}</span>
      ),
      sortValue: (p) => p.summary.usageCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "movements",
      header: "Операций",
      accessor: (p) => <span className="tabular-nums text-muted-foreground">{p.summary.movementCount}</span>,
      sortValue: (p) => p.summary.movementCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "last",
      header: "Последняя операция",
      accessor: (p) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {p.summary.lastOperationAt ? formatDate(p.summary.lastOperationAt) : "—"}
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
      emptyMessage="Объекты не заведены"
      onRowClick={(p) => router.push(`/projects/${p.id}`)}
    />
  );
}

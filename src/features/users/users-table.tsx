"use client";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/constants/roles";
import { formatDate } from "@/lib/format";
import type { User } from "@/types";
import { UserFormDialog } from "./user-form-dialog";

export interface UserRowData extends User {
  operationCount: number;
}

export function UsersTable({ users }: { users: UserRowData[] }) {
  const columns: DataTableColumn<UserRowData>[] = [
    {
      id: "name",
      header: "Сотрудник",
      accessor: (u) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{u.fullName}</span>
            {!u.isActive && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Отключён
              </Badge>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            @{u.username}
            {u.position ? ` · ${u.position}` : ""}
          </div>
        </div>
      ),
      sortValue: (u) => u.fullName,
    },
    {
      id: "role",
      header: "Роль",
      accessor: (u) => (
        <Badge
          variant="outline"
          className={
            u.role === "ADMIN"
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-border bg-muted/60 text-muted-foreground"
          }
        >
          {ROLE_LABELS[u.role]}
        </Badge>
      ),
      sortValue: (u) => u.role,
    },
    {
      id: "phone",
      header: "Телефон",
      accessor: (u) => <span className="whitespace-nowrap text-muted-foreground">{u.phone || "—"}</span>,
    },
    {
      id: "operations",
      header: "Провёл операций",
      accessor: (u) => <span className="tabular-nums">{u.operationCount}</span>,
      sortValue: (u) => u.operationCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "created",
      header: "В системе с",
      accessor: (u) => (
        <span className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt)}</span>
      ),
      sortValue: (u) => new Date(u.createdAt).getTime(),
    },
    {
      id: "actions",
      header: "",
      accessor: (u) => <UserFormDialog user={u} />,
      className: "text-right",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      rowKey={(u) => u.id}
      pageSize={12}
      emptyMessage="Сотрудники не найдены"
    />
  );
}

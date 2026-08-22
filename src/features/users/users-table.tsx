"use client";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { Badge } from "@/components/ui/badge";
import { useIntlTag, useT } from "@/i18n/client";
import { formatDate } from "@/lib/format";
import type { User } from "@/types";
import { UserFormDialog } from "./user-form-dialog";

export interface UserRowData extends User {
  operationCount: number;
}

export function UsersTable({ users }: { users: UserRowData[] }) {
  const t = useT();
  const locale = useIntlTag();
  const columns: DataTableColumn<UserRowData>[] = [
    {
      id: "name",
      header: t("users.title"),
      accessor: (u) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{u.fullName}</span>
            {!u.isActive && (
              <Badge variant="outline" className="shrink-0 text-[11px]">
                {t("users.disabled")}
              </Badge>
            )}
          </div>
          <div className="truncate text-[13px] text-muted-foreground">
            @{u.username}
            {u.position ? ` · ${u.position}` : ""}
          </div>
        </div>
      ),
      sortValue: (u) => u.fullName,
    },
    {
      id: "role",
      header: t("roles.title"),
      accessor: (u) => (
        <Badge
          variant="outline"
          className={
            u.role === "ADMIN"
              ? "border-[#cfe0f2] bg-[#eef4fb] text-[#1d4e7f]"
              : "border-border bg-muted/60 text-muted-foreground"
          }
        >
          {t(`roles.${u.role}`)}
        </Badge>
      ),
      sortValue: (u) => u.role,
    },
    {
      id: "phone",
      header: t("users.phone"),
      accessor: (u) => <span className="whitespace-nowrap text-muted-foreground">{u.phone || "—"}</span>,
    },
    {
      id: "operations",
      header: t("users.operationsCount"),
      accessor: (u) => <span className="tabular-nums">{u.operationCount}</span>,
      sortValue: (u) => u.operationCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "created",
      header: t("users.since"),
      accessor: (u) => (
        <span className="whitespace-nowrap text-muted-foreground">{formatDate(u.createdAt, locale)}</span>
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
      emptyMessage={t("users.notFound")}
      mobileCard={(u) => ({
        title: u.fullName,
        subtitle: `@${u.username}${u.position ? ` · ${u.position}` : ""}`,
        trailing: <UserFormDialog user={u} />,
      })}
    />
  );
}

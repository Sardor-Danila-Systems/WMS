import { PageHeader } from "@/shared/components/page-header";
import { getT } from "@/i18n/server";
import { HistoryFilters } from "@/features/history/history-filters";
import { MovementsTable } from "@/features/operations/movements-table";
import { listForemen, listMaterials, listMovements, listProjects, listUsers } from "@/server/queries";
import type { MovementFilters } from "@/server/queries";
import type { MovementType } from "@/types";

/** Переводит выбранный период в дату начала отбора. */
function periodToFrom(period: string | undefined): string | undefined {
  if (!period || period === "all") return undefined;
  const date = new Date();
  if (period === "today") {
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }
  const days = Number(period);
  if (!Number.isFinite(days)) return undefined;
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => {
    const raw = params[key];
    return typeof raw === "string" ? raw : "";
  };

  const filters: MovementFilters = {
    type: (value("type") || "all") as MovementType | "all",
    materialId: value("materialId"),
    foremanId: value("foremanId"),
    userId: value("userId"),
    projectId: value("projectId"),
    from: periodToFrom(value("period")),
  };

  const [t, movements] = await Promise.all([getT(), listMovements(filters)]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("history.title")} description={t("history.subtitle")} />

      <HistoryFilters
        materials={await listMaterials({ includeArchived: true })}
        foremen={await listForemen({ includeInactive: true })}
        users={await listUsers({ includeInactive: true })}
        projects={await listProjects({ includeInactive: true })}
        current={{
          type: value("type"),
          materialId: value("materialId"),
          foremanId: value("foremanId"),
          userId: value("userId"),
          projectId: value("projectId"),
          period: value("period"),
        }}
      />

      <div className="text-[13px] text-muted-foreground">
        {t("history.found")}:{" "}
        <span className="font-medium tabular-nums text-foreground">{movements.length}</span>
      </div>

      <MovementsTable
        movements={movements}
        columns={[
          "type",
          "date",
          "material",
          "quantity",
          "delta",
          "stockAfter",
          "supplier",
          "foreman",
          "project",
          "user",
          "comment",
        ]}
        pageSize={15}
        emptyMessage={t("history.empty")}
        exportName="istoriya-operatsiy"
      />
    </div>
  );
}

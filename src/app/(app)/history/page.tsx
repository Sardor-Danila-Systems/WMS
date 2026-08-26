import { PageHeader } from "@/shared/components/page-header";
import { getT } from "@/i18n/server";
import { HistoryFilters } from "@/features/history/history-filters";
import { MovementsTable } from "@/features/operations/movements-table";
import {
  listBlocks,
  listMaterials,
  listMovements,
  listOrganizations,
  listSuppliers,
  listUsers,
} from "@/server/queries";
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
    blockId: value("blockId"),
    userId: value("userId"),
    organizationId: value("organizationId"),
    supplierId: value("supplierId"),
    from: periodToFrom(value("period")),
  };

  // Все выборки независимы — запускаем параллельно. Последовательные await
  // прямо в разметке складывались бы в несколько кругов по сети до базы.
  const [t, movements, materials, blocks, users, organizations, suppliers] = await Promise.all([
    getT(),
    listMovements(filters),
    listMaterials({ includeArchived: true }),
    listBlocks({ includeInactive: true }),
    listUsers({ includeInactive: true }),
    listOrganizations({ includeInactive: true }),
    listSuppliers({ includeInactive: true }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("history.title")} description={t("history.subtitle")} />

      <HistoryFilters
        materials={materials}
        blocks={blocks}
        users={users}
        organizations={organizations}
        suppliers={suppliers}
        current={{
          type: value("type"),
          materialId: value("materialId"),
          blockId: value("blockId"),
          userId: value("userId"),
          organizationId: value("organizationId"),
          supplierId: value("supplierId"),
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
          "invoice",
          "material",
          "quantity",
          "price",
          "amount",
          "delta",
          "stockAfter",
          "supplier",
          "block",
          "payment",
          "user",
        ]}
        pageSize={15}
        emptyMessage={t("history.empty")}
        exportName="istoriya-operatsiy"
      />
    </div>
  );
}

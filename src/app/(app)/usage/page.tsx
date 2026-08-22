import { PageHeader } from "@/shared/components/page-header";
import { MovementsTable } from "@/features/operations/movements-table";
import { OperationDialog } from "@/features/operations/operation-dialog";
import { getT } from "@/i18n/server";
import { listMovements } from "@/server/queries";
import { getOperationRefData } from "@/server/ref-data";

export default async function Page() {
  const [t, movements, refData] = await Promise.all([
    getT(),
    listMovements({ type: "USAGE" }),
    getOperationRefData(),
  ]);

  return (
    <div>
      <PageHeader
        title={t("operations.usage.title")}
        description={t("operations.usage.subtitle")}
        actions={<OperationDialog type="USAGE" data={refData} />}
      />
      <MovementsTable
        movements={movements}
        columns={["date", "material", "quantity", "foreman", "project", "user", "comment"]}
        emptyMessage={t("operations.usage.empty")}
        exportName="ispolzovanie"
      />
    </div>
  );
}

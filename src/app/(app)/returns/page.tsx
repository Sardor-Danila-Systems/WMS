import { PageHeader } from "@/shared/components/page-header";
import { MovementsTable } from "@/features/operations/movements-table";
import { OperationDialog } from "@/features/operations/operation-dialog";
import { getDictionary } from "@/i18n/server";
import { listMovements } from "@/server/queries";
import { getOperationRefData } from "@/server/ref-data";

export default async function Page() {
  const [t, movements, refData] = await Promise.all([
    getDictionary(),
    listMovements({ type: "RETURN" }),
    getOperationRefData(),
  ]);

  return (
    <div>
      <PageHeader
        title={t.operations.return.title}
        description={t.operations.return.subtitle}
        actions={<OperationDialog type="RETURN" data={refData} />}
      />
      <MovementsTable
        movements={movements}
        columns={["date", "material", "quantity", "stockAfter", "foreman", "reason", "returnAcceptedBy", "comment"]}
        emptyMessage={t.operations.return.empty}
        exportName="vozvraty"
      />
    </div>
  );
}

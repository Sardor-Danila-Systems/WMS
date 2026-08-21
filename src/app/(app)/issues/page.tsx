import { PageHeader } from "@/shared/components/page-header";
import { MovementsTable } from "@/features/operations/movements-table";
import { OperationDialog } from "@/features/operations/operation-dialog";
import { listMovements } from "@/server/queries";
import { getOperationRefData } from "@/server/ref-data";

export default async function IssuesPage() {
  const movements = listMovements({ type: "ISSUE" });
  const refData = getOperationRefData();

  return (
    <div>
      <PageHeader
        title="Выдачи"
        description="Выдача материалов бригадирам на объекты"
        actions={<OperationDialog type="ISSUE" data={refData} />}
      />
      <MovementsTable
        movements={movements}
        columns={["date", "material", "quantity", "stockAfter", "foreman", "project", "issuedBy", "comment"]}
        emptyMessage="Выдач пока не было"
        exportName="vydachi"
      />
    </div>
  );
}

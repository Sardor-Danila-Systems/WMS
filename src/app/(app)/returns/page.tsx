import { PageHeader } from "@/shared/components/page-header";
import { MovementsTable } from "@/features/operations/movements-table";
import { OperationDialog } from "@/features/operations/operation-dialog";
import { listMovements } from "@/server/queries";
import { getOperationRefData } from "@/server/ref-data";

export default async function ReturnsPage() {
  const movements = listMovements({ type: "RETURN" });
  const refData = getOperationRefData();

  return (
    <div>
      <PageHeader
        title="Возвраты"
        description="Возврат неизрасходованных материалов от бригад на склад"
        actions={<OperationDialog type="RETURN" data={refData} />}
      />
      <MovementsTable
        movements={movements}
        columns={["date", "material", "quantity", "stockAfter", "foreman", "reason", "returnAcceptedBy", "comment"]}
        emptyMessage="Возвратов пока не было"
        exportName="vozvraty"
      />
    </div>
  );
}

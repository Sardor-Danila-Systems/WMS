import { PageHeader } from "@/shared/components/page-header";
import { MovementsTable } from "@/features/operations/movements-table";
import { OperationDialog } from "@/features/operations/operation-dialog";
import { listMovements } from "@/server/queries";
import { getOperationRefData } from "@/server/ref-data";

export default async function ReceiptsPage() {
  const movements = listMovements({ type: "RECEIPT" });
  const refData = getOperationRefData();

  return (
    <div>
      <PageHeader
        title="Поступления"
        description="Приём материалов от поставщиков на склад"
        actions={<OperationDialog type="RECEIPT" data={refData} />}
      />
      <MovementsTable
        movements={movements}
        columns={["date", "material", "quantity", "stockAfter", "supplier", "vehicle", "acceptedBy", "comment"]}
        emptyMessage="Поступлений пока не было"
        exportName="postupleniya"
      />
    </div>
  );
}

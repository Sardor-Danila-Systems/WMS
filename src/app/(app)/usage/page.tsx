import { PageHeader } from "@/shared/components/page-header";
import { MovementsTable } from "@/features/operations/movements-table";
import { OperationDialog } from "@/features/operations/operation-dialog";
import { listMovements } from "@/server/queries";
import { getOperationRefData } from "@/server/ref-data";

export default async function UsagePage() {
  const movements = listMovements({ type: "USAGE" });
  const refData = getOperationRefData();

  return (
    <div>
      <PageHeader
        title="Использование"
        description="Списание материалов, израсходованных бригадами на объектах"
        actions={<OperationDialog type="USAGE" data={refData} />}
      />
      <MovementsTable
        movements={movements}
        columns={["date", "material", "quantity", "foreman", "project", "user", "comment"]}
        emptyMessage="Списаний на объекты пока не было"
        exportName="ispolzovanie"
      />
    </div>
  );
}

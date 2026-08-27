import { PageHeader } from "@/shared/components/page-header";
import { MovementsTable } from "@/features/operations/movements-table";
import { OperationDialog } from "@/features/operations/operation-dialog";
import { getT } from "@/i18n/server";
import { listMovements } from "@/server/queries";
import { getOperationRefData } from "@/server/ref-data";

export default async function Page() {
  const [t, movements, refData] = await Promise.all([
    getT(),
    listMovements({ type: "ISSUE" }),
    getOperationRefData(),
  ]);

  return (
    <div>
      <PageHeader
        title={t("operations.issue.title")}
        description={t("operations.issue.subtitle")}
        actions={<OperationDialog type="ISSUE" data={refData} />}
      />
      <MovementsTable
        movements={movements}
        columns={[
          "date",
          "block",
          "material",
          "quantity",
          "price",
          "amount",
          "stockAfter",
          "issuedBy",
          "comment",
        ]}
        emptyMessage={t("operations.issue.empty")}
        exportName="rashod"
      />
    </div>
  );
}

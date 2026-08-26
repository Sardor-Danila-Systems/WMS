import { PageHeader } from "@/shared/components/page-header";
import { MovementsTable } from "@/features/operations/movements-table";
import { OperationDialog } from "@/features/operations/operation-dialog";
import { getT } from "@/i18n/server";
import { listMovements } from "@/server/queries";
import { getOperationRefData } from "@/server/ref-data";

export default async function Page() {
  const [t, movements, refData] = await Promise.all([
    getT(),
    listMovements({ type: "RECEIPT" }),
    getOperationRefData(),
  ]);

  return (
    <div>
      <PageHeader
        title={t("operations.receipt.title")}
        description={t("operations.receipt.subtitle")}
        actions={<OperationDialog type="RECEIPT" data={refData} />}
      />
      <MovementsTable
        movements={movements}
        columns={[
          "date",
          "invoice",
          "material",
          "quantity",
          "price",
          "amount",
          "supplier",
          "payment",
          "vehicle",
          "acceptedBy",
        ]}
        emptyMessage={t("operations.receipt.empty")}
        exportName="prihod"
      />
    </div>
  );
}

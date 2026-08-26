import { PageHeader } from "@/shared/components/page-header";
import { SuppliersTable } from "@/features/suppliers/suppliers-table";
import { SupplierFormDialog } from "@/features/suppliers/supplier-form-dialog";
import { getSupplierSummaries, listSuppliers } from "@/server/queries";
import { getT } from "@/i18n/server";

export default async function SuppliersPage() {
  const [t, summaries, list] = await Promise.all([
    getT(),
    getSupplierSummaries(),
    listSuppliers({ includeInactive: true }),
  ]);

  const suppliers = list.map((supplier) => ({
    ...supplier,
    summary: summaries.get(supplier.id) ?? {
      supplierId: supplier.id,
      receiptCount: 0,
      materialCount: 0,
      amount: 0,
      cashAmount: 0,
      transferAmount: 0,
      lastReceiptAt: null,
    },
  }));

  return (
    <div>
      <PageHeader
        title={t("suppliers.title")}
        description={t("suppliers.subtitle")}
        actions={<SupplierFormDialog />}
      />
      <SuppliersTable suppliers={suppliers} />
    </div>
  );
}

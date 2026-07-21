import { PageHeader } from "@/shared/components/page-header";
import { ReceiptsTable } from "@/features/receipts/receipts-table";
import { ReceiptFormDialog } from "@/features/receipts/receipt-form-dialog";

export default function ReceiptsPage() {
  return (
    <div>
      <PageHeader
        title="Поступления"
        description="Регистрация новых поставок материалов на склад"
        actions={<ReceiptFormDialog />}
      />
      <ReceiptsTable />
    </div>
  );
}

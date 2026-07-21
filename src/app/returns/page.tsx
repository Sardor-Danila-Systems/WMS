import { PageHeader } from "@/shared/components/page-header";
import { ReturnsTable } from "@/features/returns/returns-table";
import { ReturnFormDialog } from "@/features/returns/return-form-dialog";

export default function ReturnsPage() {
  return (
    <div>
      <PageHeader
        title="Возвраты"
        description="Возврат материалов от бригад обратно на склад"
        actions={<ReturnFormDialog />}
      />
      <ReturnsTable />
    </div>
  );
}

import { PageHeader } from "@/shared/components/page-header";
import { WorkersTable } from "@/features/workers/workers-table";

export default function WorkersPage() {
  return (
    <div>
      <PageHeader title="Работники склада" description="Сотрудники, выполняющие складские операции" />
      <WorkersTable />
    </div>
  );
}

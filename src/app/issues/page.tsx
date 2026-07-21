import { PageHeader } from "@/shared/components/page-header";
import { IssuesTable } from "@/features/issues/issues-table";
import { IssueFormDialog } from "@/features/issues/issue-form-dialog";

export default function IssuesPage() {
  return (
    <div>
      <PageHeader
        title="Выдачи"
        description="Выдача материалов бригадам на объекты"
        actions={<IssueFormDialog />}
      />
      <IssuesTable />
    </div>
  );
}

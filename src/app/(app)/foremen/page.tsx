import { PageHeader } from "@/shared/components/page-header";
import { ForemenTable } from "@/features/foremen/foremen-table";
import { ForemanFormDialog } from "@/features/foremen/foreman-form-dialog";
import { getForemenSummaries, listForemen, listProjects } from "@/server/queries";

export default async function ForemenPage() {
  const summaries = getForemenSummaries();
  const foremen = listForemen().map((foreman) => ({
    ...foreman,
    summary: summaries.get(foreman.id) ?? {
      foremanId: foreman.id,
      positions: 0,
      issueCount: 0,
      usageCount: 0,
      returnCount: 0,
      lastOperationAt: null,
    },
  }));

  return (
    <div>
      <PageHeader
        title="Бригадиры"
        description="Кто получает материалы со склада и что сейчас числится за каждым"
        actions={<ForemanFormDialog projects={listProjects()} />}
      />
      <ForemenTable foremen={foremen} />
    </div>
  );
}

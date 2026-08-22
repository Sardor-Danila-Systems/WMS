import { PageHeader } from "@/shared/components/page-header";
import { ForemenTable } from "@/features/foremen/foremen-table";
import { ForemanFormDialog } from "@/features/foremen/foreman-form-dialog";
import { getForemenSummaries, listForemen, listProjects } from "@/server/queries";
import { getDictionary } from "@/i18n/server";

export default async function ForemenPage() {
  const [t, summaries, list, projects] = await Promise.all([
    getDictionary(),
    getForemenSummaries(),
    listForemen(),
    listProjects(),
  ]);

  const foremen = list.map((foreman) => ({
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
        title={t.foremen.title}
        description={t.foremen.subtitle}
        actions={<ForemanFormDialog projects={projects} />}
      />
      <ForemenTable foremen={foremen} />
    </div>
  );
}

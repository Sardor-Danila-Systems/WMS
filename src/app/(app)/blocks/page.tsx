import { PageHeader } from "@/shared/components/page-header";
import { BlocksTable } from "@/features/blocks/blocks-table";
import { BlockFormDialog } from "@/features/blocks/block-form-dialog";
import { getBlockSummaries, listBlocks, listOrganizations } from "@/server/queries";
import { getT } from "@/i18n/server";

export default async function BlocksPage() {
  const [t, summaries, list, organizations] = await Promise.all([
    getT(),
    getBlockSummaries(),
    listBlocks({ includeInactive: true }),
    listOrganizations(),
  ]);

  const blocks = list.map((block) => ({
    ...block,
    summary: summaries.get(block.id) ?? {
      blockId: block.id,
      positions: 0,
      issueCount: 0,
      returnCount: 0,
      amount: 0,
      lastOperationAt: null,
    },
  }));

  // Новый блок встаёт после существующих, а не перед блоком A.
  const nextSortOrder = list.reduce((max, block) => Math.max(max, block.sortOrder), -1) + 1;

  return (
    <div>
      <PageHeader
        title={t("blocks.title")}
        description={t("blocks.subtitle")}
        actions={
          <BlockFormDialog organizations={organizations} nextSortOrder={nextSortOrder} />
        }
      />
      <BlocksTable blocks={blocks} />
    </div>
  );
}

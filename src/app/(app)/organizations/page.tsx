import { redirect } from "next/navigation";

import { PageHeader } from "@/shared/components/page-header";
import { OrganizationsTable } from "@/features/organizations/organizations-table";
import { OrganizationFormDialog } from "@/features/organizations/organization-form-dialog";
import { requireUser, roleCan } from "@/lib/auth/dal";
import { getOrganizationSummaries, listOrganizations } from "@/server/queries";
import { getT } from "@/i18n/server";

export default async function OrganizationsPage() {
  const user = await requireUser();
  if (!roleCan(user.role, "organization:write")) redirect("/");

  const [t, summaries, list] = await Promise.all([
    getT(),
    getOrganizationSummaries(),
    listOrganizations({ includeInactive: true }),
  ]);

  const organizations = list.map((organization) => ({
    ...organization,
    summary: summaries.get(organization.id) ?? {
      organizationId: organization.id,
      blocksCount: 0,
      materialCount: 0,
      movementCount: 0,
      receiptAmount: 0,
      issueAmount: 0,
      lastOperationAt: null,
    },
  }));

  return (
    <div>
      <PageHeader
        title={t("organizations.title")}
        description={t("organizations.subtitle")}
        actions={<OrganizationFormDialog />}
      />
      <OrganizationsTable organizations={organizations} />
    </div>
  );
}

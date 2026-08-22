import { redirect } from "next/navigation";

import { PageHeader } from "@/shared/components/page-header";
import { UsersTable } from "@/features/users/users-table";
import { UserFormDialog } from "@/features/users/user-form-dialog";
import { requireUser, roleCan } from "@/lib/auth/dal";
import { getUserOperationCounts, listUsers } from "@/server/queries";
import { getT } from "@/i18n/server";

export default async function WorkersPage() {
  const user = await requireUser();
  // Раздел доступен только администратору; остальных возвращаем на дашборд.
  if (!roleCan(user.role, "user:write")) redirect("/");

  const [t, counts, list] = await Promise.all([
    getT(),
    getUserOperationCounts(),
    listUsers({ includeInactive: true }),
  ]);

  const users = list.map((u) => ({
    ...u,
    operationCount: counts.get(u.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title={t("users.title")}
        description={t("users.subtitle")}
        actions={<UserFormDialog />}
      />
      <UsersTable users={users} />
    </div>
  );
}

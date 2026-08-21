import { redirect } from "next/navigation";

import { PageHeader } from "@/shared/components/page-header";
import { UsersTable } from "@/features/users/users-table";
import { UserFormDialog } from "@/features/users/user-form-dialog";
import { requireUser, roleCan } from "@/lib/auth/dal";
import { getUserOperationCounts, listUsers } from "@/server/queries";

export default async function WorkersPage() {
  const user = await requireUser();
  // Раздел доступен только администратору; остальных возвращаем на дашборд.
  if (!roleCan(user.role, "user:write")) redirect("/");

  const counts = getUserOperationCounts();
  const users = listUsers({ includeInactive: true }).map((u) => ({
    ...u,
    operationCount: counts.get(u.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Сотрудники"
        description="Работники склада и их доступ в систему. По логину видно, кто провёл каждую операцию."
        actions={<UserFormDialog />}
      />
      <UsersTable users={users} />
    </div>
  );
}

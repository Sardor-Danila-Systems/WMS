import { redirect } from "next/navigation";

import { PageHeader } from "@/shared/components/page-header";
import { SettingsView } from "@/features/settings/settings-view";
import { requireUser, roleCan } from "@/lib/auth/dal";
import { getSetting } from "@/server/catalog";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!roleCan(user.role, "settings:write")) redirect("/");

  return (
    <div>
      <PageHeader title="Настройки" description="Параметры системы и справочники" />
      <SettingsView
        companyName={getSetting("company_name", "ООО «СтройХолдинг»")}
        warehouseAddress={getSetting("warehouse_address", "")}
      />
    </div>
  );
}

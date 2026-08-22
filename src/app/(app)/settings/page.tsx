import { redirect } from "next/navigation";

import { PageHeader } from "@/shared/components/page-header";
import { SettingsView } from "@/features/settings/settings-view";
import { requireUser, roleCan } from "@/lib/auth/dal";
import { getSetting } from "@/server/catalog";
import { getDictionary } from "@/i18n/server";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!roleCan(user.role, "settings:write")) redirect("/");

  const [t, companyName, warehouseAddress] = await Promise.all([
    getDictionary(),
    getSetting("company_name", "Gagarin Avenue"),
    getSetting("warehouse_address", ""),
  ]);

  return (
    <div>
      <PageHeader title={t.settings.title} description={t.settings.subtitle} />
      <SettingsView companyName={companyName} warehouseAddress={warehouseAddress} />
    </div>
  );
}

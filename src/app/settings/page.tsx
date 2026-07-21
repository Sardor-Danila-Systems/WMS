import { PageHeader } from "@/shared/components/page-header";
import { SettingsView } from "@/features/settings/settings-view";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Настройки" description="Параметры системы и справочники" />
      <SettingsView />
    </div>
  );
}

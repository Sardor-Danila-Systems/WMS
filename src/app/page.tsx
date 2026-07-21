import { PageHeader } from "@/shared/components/page-header";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Дашборд"
        description="Общая картина по складу строительных материалов на сегодня"
      />
      <DashboardView />
    </div>
  );
}

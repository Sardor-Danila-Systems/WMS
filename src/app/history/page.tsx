import { PageHeader } from "@/shared/components/page-header";
import { HistoryView } from "@/features/history/history-view";

export default function HistoryPage() {
  return (
    <div>
      <PageHeader
        title="История операций"
        description="Полная история движения материалов по складу"
      />
      <HistoryView />
    </div>
  );
}

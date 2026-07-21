import { PageHeader } from "@/shared/components/page-header";
import { ExportCards } from "@/features/reports/export-cards";
import { ReportPreviewTable } from "@/features/reports/report-preview-table";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Отчёты"
        description="Выгрузка складских данных в Excel, CSV или PDF"
      />
      <ExportCards />
      <ReportPreviewTable />
    </div>
  );
}

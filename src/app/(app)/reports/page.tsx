import { PageHeader } from "@/shared/components/page-header";
import { ReportsView } from "@/features/reports/reports-view";
import { getForemanReport, getProjectReport, getStockReport } from "@/server/queries";

/** Период отчёта в дату начала выборки. */
function periodToFrom(period: string): string | undefined {
  if (!period || period === "all") return undefined;
  const days = Number(period);
  if (!Number.isFinite(days)) return undefined;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const period = typeof params.period === "string" ? params.period : "all";
  const from = periodToFrom(period);

  return (
    <div>
      <PageHeader
        title="Отчёты"
        description="Остатки, обороты и расход материалов с выгрузкой в Excel и CSV"
      />
      <ReportsView
        stock={getStockReport(from)}
        foremen={getForemanReport(from)}
        projects={getProjectReport(from)}
        period={period}
      />
    </div>
  );
}

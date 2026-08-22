import { PageHeader } from "@/shared/components/page-header";
import { ReportsView } from "@/features/reports/reports-view";
import { getForemanReport, getProjectReport, getStockReport } from "@/server/queries";
import { getT } from "@/i18n/server";

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

  const [t, stock, foremen, projects] = await Promise.all([
    getT(),
    getStockReport(from),
    getForemanReport(from),
    getProjectReport(from),
  ]);

  return (
    <div>
      <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />
      <ReportsView stock={stock} foremen={foremen} projects={projects} period={period} />
    </div>
  );
}

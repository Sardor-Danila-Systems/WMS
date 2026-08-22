"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOVEMENT_COLORS } from "@/constants/colors";
import { useIntlTag, useT } from "@/i18n/client";
import { formatLongDate } from "@/lib/format";
import type { DailyActivity } from "@/server/queries";

const SERIES = [
  { key: "receipts", type: "RECEIPT" as const },
  { key: "issues", type: "ISSUE" as const },
  { key: "usages", type: "USAGE" as const },
  { key: "returns", type: "RETURN" as const },
];

function shortDate(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}.${month}`;
}

function ActivityTooltip({
  active,
  payload,
  label,
  locale,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  locale: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, entry) => sum + entry.value, 0);
  if (total === 0) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-[13px] shadow-sm">
      <div className="mb-1.5 font-medium text-popover-foreground">
        {label ? formatLongDate(label, locale) : ""}
      </div>
      <div className="space-y-1">
        {payload
          .filter((entry) => entry.value > 0)
          .map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="ml-auto font-medium tabular-nums text-popover-foreground">
                {entry.value}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

export function ActivityChart({ data }: { data: DailyActivity[] }) {
  const t = useT();
  const locale = useIntlTag();
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-[14.5px] font-semibold">{t("dashboard.chartTitle")}</CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
          {SERIES.map((series) => (
            <span key={series.key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: MOVEMENT_COLORS[series.type].color }}
              />
              {t(`movements.${series.type}`)}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tickFormatter={shortDate}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                width={32}
                allowDecimals={false}
              />
              <Tooltip cursor={{ fill: "rgba(11,11,11,0.04)" }} content={<ActivityTooltip locale={locale} />} />
              {SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={t(`movements.${series.type}`)}
                  fill={MOVEMENT_COLORS[series.type].color}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={12}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

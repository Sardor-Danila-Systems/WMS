"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOVEMENT_META } from "@/constants/colors";
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
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, entry) => sum + entry.value, 0);
  if (total === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1.5 font-medium text-popover-foreground">
        {label ? new Date(label).toLocaleDateString("ru-RU", { day: "2-digit", month: "long" }) : ""}
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
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-semibold">Операции за 14 дней</CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {SERIES.map((series) => (
            <span key={series.key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: MOVEMENT_META[series.type].color }}
              />
              {MOVEMENT_META[series.type].label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tickFormatter={shortDate}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#898781", fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#898781", fontSize: 11 }}
                width={32}
                allowDecimals={false}
              />
              <Tooltip cursor={{ fill: "rgba(11,11,11,0.04)" }} content={<ActivityTooltip />} />
              {SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={MOVEMENT_META[series.type].label}
                  fill={MOVEMENT_META[series.type].color}
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

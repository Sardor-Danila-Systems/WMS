"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWarehouseStore } from "@/store/warehouse-store";
import { getActivityByDay } from "@/store/selectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RECEIPT_COLOR = "#2a78d6";
const ISSUE_COLOR = "#eb6834";

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/5">
      <div className="mb-1.5 font-medium text-popover-foreground">{label}</div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-popover-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReceiptsIssuesChart() {
  const operations = useWarehouseStore((s) => s.operations);
  const data = useMemo(() => getActivityByDay(operations, 14), [operations]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Поступления и выдачи по дням</CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RECEIPT_COLOR }} />
            Поступления
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ISSUE_COLOR }} />
            Выдачи
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#898781", fontSize: 11 }}
                interval={1}
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#898781", fontSize: 11 }} width={28} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(11,11,11,0.04)" }} content={<ChartTooltip />} />
              <Bar dataKey="receipts" name="Поступления" fill={RECEIPT_COLOR} radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Bar dataKey="issues" name="Выдачи" fill={ISSUE_COLOR} radius={[3, 3, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatQuantity } from "@/lib/format";
import type { BalancePoint } from "@/server/queries";

const LINE_COLOR = "#2a78d6";

function shortDate(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}.${month}`;
}

function BalanceTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload: BalancePoint }[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium text-popover-foreground">
        {new Date(point.day).toLocaleDateString("ru-RU", { day: "2-digit", month: "long" })}
      </div>
      <div className="text-muted-foreground">
        Остаток:{" "}
        <span className="font-medium tabular-nums text-popover-foreground">
          {formatQuantity(point.balance, unit)}
        </span>
      </div>
    </div>
  );
}

export function MaterialBalanceChart({ data, unit }: { data: BalancePoint[]; unit: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Остаток на складе за 30 дней</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tickFormatter={shortDate}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#898781", fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#898781", fontSize: 11 }}
                width={44}
              />
              <Tooltip content={<BalanceTooltip unit={unit} />} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={LINE_COLOR}
                strokeWidth={2}
                fill="url(#balanceFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

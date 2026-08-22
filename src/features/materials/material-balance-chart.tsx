"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLongDate, formatQuantity } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import type { BalancePoint } from "@/server/queries";

const LINE_COLOR = "#2563a8";

function shortDate(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}.${month}`;
}

function BalanceTooltip({
  active,
  payload,
  unit,
  label,
  locale,
}: {
  active?: boolean;
  payload?: { payload: BalancePoint }[];
  unit: string;
  label: string;
  locale: Parameters<typeof formatQuantity>[2];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium text-popover-foreground">
        {formatLongDate(point.day, locale)}
      </div>
      <div className="text-muted-foreground">
        {label}:{" "}
        <span className="font-medium tabular-nums text-popover-foreground">
          {formatQuantity(point.balance, unit, locale)}
        </span>
      </div>
    </div>
  );
}

export function MaterialBalanceChart({ data, unit }: { data: BalancePoint[]; unit: string }) {
  const { t, locale } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[13px] font-semibold">{t.materials.detail.balanceChart}</CardTitle>
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
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tickFormatter={shortDate}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                width={44}
              />
              <Tooltip content={<BalanceTooltip unit={unit} label={t.materials.detail.balanceTooltip} locale={locale} />} />
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

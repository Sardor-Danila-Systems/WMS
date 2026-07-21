"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWarehouseStore } from "@/store/warehouse-store";
import { getStockStatus, STOCK_STATUS } from "@/constants/colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RatioTooltipPayload {
  name: string;
  ratio: number;
  quantity: number;
  unit: string;
}

function RatioTooltip({ active, payload }: { active?: boolean; payload?: { payload: RatioTooltipPayload }[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/5">
      <div className="mb-1 font-medium text-popover-foreground">{item.name}</div>
      <div className="text-muted-foreground">
        Остаток: <span className="font-medium text-popover-foreground">{item.quantity} {item.unit}</span>
      </div>
      <div className="text-muted-foreground">
        От нормы: <span className="font-medium text-popover-foreground">{item.ratio}%</span>
      </div>
    </div>
  );
}

export function StockRatioChart() {
  const materials = useWarehouseStore((s) => s.materials);

  const data = useMemo(() => {
    return materials
      .map((m) => ({
        name: m.name,
        quantity: m.quantity,
        unit: m.unit,
        ratio: Math.round((m.quantity / m.minStock) * 100),
        status: getStockStatus(m.quantity, m.minStock),
      }))
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 8)
      .reverse();
  }, [materials]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Остатки материалов от нормы</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
              <XAxis type="number" hide domain={[0, (dataMax: number) => Math.max(dataMax, 150)]} />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#52514e", fontSize: 11 }}
              />
              <Tooltip cursor={{ fill: "rgba(11,11,11,0.04)" }} content={<RatioTooltip />} />
              <Bar dataKey="ratio" radius={[0, 3, 3, 0]} maxBarSize={14}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={STOCK_STATUS[entry.status].color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

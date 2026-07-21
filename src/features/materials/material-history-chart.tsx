"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getMaterialBalanceHistory } from "@/store/selectors";
import type { Material, Operation } from "@/types";

const BALANCE_COLOR = "#2a78d6";

function BalanceTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/5">
      <div className="mb-1 font-medium text-popover-foreground">{label}</div>
      <div className="text-muted-foreground">
        Остаток: <span className="font-medium text-popover-foreground">{payload[0].value} {unit}</span>
      </div>
    </div>
  );
}

export function MaterialHistoryChart({ material, operations }: { material: Material; operations: Operation[] }) {
  const data = useMemo(() => getMaterialBalanceHistory(operations, material, 30), [operations, material]);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BALANCE_COLOR} stopOpacity={0.25} />
              <stop offset="100%" stopColor={BALANCE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#898781", fontSize: 11 }}
            interval={4}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#898781", fontSize: 11 }} width={32} />
          <Tooltip content={<BalanceTooltip unit={material.unit} />} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={BALANCE_COLOR}
            strokeWidth={2}
            fill="url(#balanceGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

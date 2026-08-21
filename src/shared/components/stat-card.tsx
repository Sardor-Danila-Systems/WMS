import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatCardColor =
  | "indigo"
  | "blue"
  | "orange"
  | "violet"
  | "teal"
  | "amber"
  | "red"
  | "slate";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  color?: StatCardColor;
}

const COLOR_STYLES: Record<StatCardColor, string> = {
  indigo: "bg-indigo-50 text-indigo-700",
  blue: "bg-blue-50 text-blue-700",
  orange: "bg-orange-50 text-orange-700",
  violet: "bg-violet-50 text-violet-700",
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  slate: "bg-muted text-muted-foreground",
};

/**
 * Плитка показателя. Серверный компонент: у неё нет состояния,
 * поэтому иконку можно передавать напрямую со страницы,
 * а в браузер не уезжает лишний JavaScript.
 */
export function StatCard({ label, value, icon: Icon, hint, color = "slate" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80 hover:bg-muted/20">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            COLOR_STYLES[color]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

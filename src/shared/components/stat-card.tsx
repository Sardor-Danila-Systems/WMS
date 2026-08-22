import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatCardTone = "neutral" | "accent" | "warning" | "danger" | "positive";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: StatCardTone;
}

const TONE: Record<StatCardTone, { icon: string; value: string }> = {
  neutral: { icon: "text-muted-foreground", value: "text-foreground" },
  accent: { icon: "text-primary", value: "text-foreground" },
  warning: { icon: "text-[#b57d13]", value: "text-[#8d6210]" },
  danger: { icon: "text-[#c33c3c]", value: "text-[#9c2f2f]" },
  positive: { icon: "text-[#2f8f4e]", value: "text-foreground" },
};

/**
 * Плитка показателя. Серверный компонент без состояния — иконку можно
 * передавать прямо со страницы, а в браузер не уезжает лишний JavaScript.
 */
export function StatCard({ label, value, icon: Icon, hint, tone = "neutral" }: StatCardProps) {
  const styles = TONE[tone];
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", styles.icon)} />
        <span className="truncate text-[12.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          {label}
        </span>
      </div>
      <div className={cn("mt-2 text-[30px] font-semibold leading-none tracking-tight tabular-nums", styles.value)}>
        {value}
      </div>
      {hint && <div className="mt-1.5 line-clamp-1 text-[13px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

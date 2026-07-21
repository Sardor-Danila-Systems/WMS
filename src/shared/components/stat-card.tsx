"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type StatCardColor = "indigo" | "blue" | "orange" | "violet" | "teal" | "amber" | "red" | "slate";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  delay?: number;
  color?: StatCardColor;
}

const COLOR_STYLES: Record<StatCardColor, { chip: string; ring: string }> = {
  indigo: { chip: "bg-indigo-50 text-indigo-600", ring: "group-hover:ring-indigo-100" },
  blue: { chip: "bg-blue-50 text-blue-700", ring: "group-hover:ring-blue-100" },
  orange: { chip: "bg-orange-50 text-orange-700", ring: "group-hover:ring-orange-100" },
  violet: { chip: "bg-violet-50 text-violet-700", ring: "group-hover:ring-violet-100" },
  teal: { chip: "bg-teal-50 text-teal-700", ring: "group-hover:ring-teal-100" },
  amber: { chip: "bg-amber-50 text-amber-700", ring: "group-hover:ring-amber-100" },
  red: { chip: "bg-red-50 text-red-700", ring: "group-hover:ring-red-100" },
  slate: { chip: "bg-muted text-foreground", ring: "group-hover:ring-border" },
};

export function StatCard({ label, value, icon: Icon, hint, delay = 0, color = "slate" }: StatCardProps) {
  const styles = COLOR_STYLES[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xs ring-1 ring-transparent transition-all duration-200 hover:shadow-lg",
        styles.ring
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110", styles.chip)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </motion.div>
  );
}

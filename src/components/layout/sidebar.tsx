"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Boxes, Sparkles } from "lucide-react";
import { NAV_ITEMS } from "@/constants/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/40">
          <Boxes className="h-4.5 w-4.5" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">СтройСклад</span>
          <span className="text-[11px] text-muted-foreground">WMS · Демо</span>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "text-indigo-700"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-indigo-50"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-bar"
                  className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-indigo-600"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <item.icon className="relative h-4 w-4 shrink-0" />
              <span className="relative truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 text-xs text-indigo-900/70">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
          <span>
            Демо-версия для презентации.
            <br />
            Данные не сохраняются на сервере.
          </span>
        </div>
      </div>
    </aside>
  );
}

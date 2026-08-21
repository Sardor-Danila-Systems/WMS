"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes } from "lucide-react";

import { visibleGroups } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ role, companyName }: { role: Role; companyName: string }) {
  const pathname = usePathname();
  const groups = visibleGroups(role);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Boxes className="h-4.5 w-4.5" />
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold tracking-tight">СтройСклад</span>
          <span className="truncate text-[11px] text-muted-foreground">{companyName}</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = isNavItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

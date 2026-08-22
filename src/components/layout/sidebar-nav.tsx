"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, visibleGroups } from "@/constants/navigation";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

/**
 * Список разделов. Используется и в боковой панели, и в мобильном меню,
 * поэтому вынесен отдельно — разметка пунктов должна быть одинаковой.
 */
export function SidebarNav({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const t = useT();
  const groups = visibleGroups(role);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.key} className="mb-6 last:mb-0">
          <div className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
            {t(`nav.groups.${group.key}`)}
          </div>
          <div className="space-y-px">
            {group.items.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[14.5px] transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {/* Тонкая метка слева вместо заливки всей строки — спокойнее выглядит. */}
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary transition-opacity",
                      active ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <item.icon
                    className={cn(
                      "h-[17px] w-[17px] shrink-0",
                      active ? "text-primary" : "text-muted-foreground/70"
                    )}
                  />
                  <span className="truncate">{t(`nav.${item.key}`)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Логотип и название системы. */
export function BrandMark({ companyName }: { companyName: string }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-[12.5px] font-bold tracking-tight text-primary-foreground">
        GA
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[14.5px] font-semibold tracking-tight">{t("app.name")}</span>
        <span className="truncate text-[12.5px] text-muted-foreground">{companyName}</span>
      </div>
    </div>
  );
}

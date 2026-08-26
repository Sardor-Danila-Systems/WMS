import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Undo2,
  History,
  Blocks,
  Truck,
  Building2,
  Users,
  FileBarChart,
  Settings,
} from "lucide-react";

import type { Role } from "@/types";

export type NavKey =
  | "dashboard"
  | "materials"
  | "receipts"
  | "issues"
  | "returns"
  | "history"
  | "blocks"
  | "suppliers"
  | "organizations"
  | "workers"
  | "reports"
  | "settings";

export type NavGroupKey = "overview" | "operations" | "directories" | "analytics";

export interface NavItem {
  /** Ключ в разделе `nav` файла сообщений. */
  key: NavKey;
  href: string;
  icon: LucideIcon;
  /** Если задано — пункт виден только этим ролям. */
  roles?: Role[];
}

export interface NavGroup {
  key: NavGroupKey;
  items: NavItem[];
}

/**
 * Меню сгруппировано по ходу работы: сначала обзор, затем ежедневные операции
 * в том порядке, в каком материал движется по складу, потом справочники.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "overview",
    items: [
      { key: "dashboard", href: "/", icon: LayoutDashboard },
      { key: "materials", href: "/materials", icon: Package },
    ],
  },
  {
    key: "operations",
    items: [
      { key: "receipts", href: "/receipts", icon: ArrowDownToLine },
      { key: "issues", href: "/issues", icon: ArrowUpFromLine },
      { key: "returns", href: "/returns", icon: Undo2 },
      { key: "history", href: "/history", icon: History },
    ],
  },
  {
    key: "directories",
    items: [
      { key: "blocks", href: "/blocks", icon: Blocks },
      { key: "suppliers", href: "/suppliers", icon: Truck },
      { key: "organizations", href: "/organizations", icon: Building2, roles: ["ADMIN"] },
      { key: "workers", href: "/workers", icon: Users, roles: ["ADMIN"] },
    ],
  },
  {
    key: "analytics",
    items: [
      { key: "reports", href: "/reports", icon: FileBarChart },
      { key: "settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function visibleGroups(role: Role): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

/** Ключ текущего раздела для заголовка верхней панели. */
export function sectionKey(pathname: string): NavKey {
  if (pathname === "/") return "dashboard";
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => item.href !== "/" && pathname.startsWith(item.href));
  return match?.key ?? "dashboard";
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

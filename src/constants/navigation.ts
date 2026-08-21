import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  TruckIcon,
  PackageMinus,
  Undo2,
  History,
  HardHat,
  Users,
  FileBarChart,
  Settings,
  Hammer,
  Building2,
} from "lucide-react";

import type { Role } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Если задано — пункт виден только этим ролям. */
  roles?: Role[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Меню сгруппировано по ходу работы: сначала обзор, затем ежедневные операции
 * в том порядке, в каком материал движется по складу, потом справочники.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Обзор",
    items: [
      { label: "Дашборд", href: "/", icon: LayoutDashboard },
      { label: "Материалы", href: "/materials", icon: Package },
    ],
  },
  {
    label: "Операции",
    items: [
      { label: "Поступления", href: "/receipts", icon: TruckIcon },
      { label: "Выдачи", href: "/issues", icon: PackageMinus },
      { label: "Использование", href: "/usage", icon: Hammer },
      { label: "Возвраты", href: "/returns", icon: Undo2 },
      { label: "История операций", href: "/history", icon: History },
    ],
  },
  {
    label: "Справочники",
    items: [
      { label: "Бригадиры", href: "/foremen", icon: HardHat },
      { label: "Объекты", href: "/projects", icon: Building2 },
      { label: "Сотрудники", href: "/workers", icon: Users, roles: ["ADMIN"] },
    ],
  },
  {
    label: "Аналитика",
    items: [
      { label: "Отчёты", href: "/reports", icon: FileBarChart },
      { label: "Настройки", href: "/settings", icon: Settings, roles: ["ADMIN"] },
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

/** Заголовок текущего раздела для верхней панели. */
export function sectionLabel(pathname: string): string {
  if (pathname === "/") return "Дашборд";
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => item.href !== "/" && pathname.startsWith(item.href));
  return match?.label ?? "СтройСклад";
}

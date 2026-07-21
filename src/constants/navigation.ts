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
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Дашборд", href: "/", icon: LayoutDashboard },
  { label: "Материалы", href: "/materials", icon: Package },
  { label: "Поступления", href: "/receipts", icon: TruckIcon },
  { label: "Выдачи", href: "/issues", icon: PackageMinus },
  { label: "Возвраты", href: "/returns", icon: Undo2 },
  { label: "История операций", href: "/history", icon: History },
  { label: "Бригадиры", href: "/foremen", icon: HardHat },
  { label: "Работники склада", href: "/workers", icon: Users },
  { label: "Отчёты", href: "/reports", icon: FileBarChart },
  { label: "Настройки", href: "/settings", icon: Settings },
];

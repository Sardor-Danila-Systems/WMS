"use client";

import { useMemo } from "react";
import { AlertTriangle, HardHat, Package, PackageMinus, TruckIcon, Undo2, Users } from "lucide-react";
import { useWarehouseStore } from "@/store/warehouse-store";
import { countTodayByType, getLowStockMaterials } from "@/store/selectors";
import { StatCard } from "@/shared/components/stat-card";

export function DashboardStatCards() {
  const materials = useWarehouseStore((s) => s.materials);
  const operations = useWarehouseStore((s) => s.operations);
  const workers = useWarehouseStore((s) => s.workers);
  const foremen = useWarehouseStore((s) => s.foremen);

  const stats = useMemo(() => {
    return {
      materialsCount: materials.length,
      receiptsToday: countTodayByType(operations, "receipt"),
      issuesToday: countTodayByType(operations, "issue"),
      returnsToday: countTodayByType(operations, "return"),
      lowStockCount: getLowStockMaterials(materials).length,
    };
  }, [materials, operations]);

  const cards = [
    {
      label: "Всего материалов",
      value: stats.materialsCount.toString(),
      icon: Package,
      hint: "Наименований на складе",
      color: "indigo" as const,
    },
    {
      label: "Поступления сегодня",
      value: stats.receiptsToday.toString(),
      icon: TruckIcon,
      hint: "Операций за день",
      color: "blue" as const,
    },
    {
      label: "Выдачи сегодня",
      value: stats.issuesToday.toString(),
      icon: PackageMinus,
      hint: "Операций за день",
      color: "orange" as const,
    },
    {
      label: "Возвраты сегодня",
      value: stats.returnsToday.toString(),
      icon: Undo2,
      hint: "Операций за день",
      color: "violet" as const,
    },
    {
      label: "Работники склада",
      value: workers.length.toString(),
      icon: Users,
      hint: "Активных сотрудников",
      color: "teal" as const,
    },
    {
      label: "Бригадиры",
      value: foremen.length.toString(),
      icon: HardHat,
      hint: "Получают материалы",
      color: "amber" as const,
    },
    {
      label: "Низкий остаток",
      value: stats.lowStockCount.toString(),
      icon: AlertTriangle,
      hint: "Требуют пополнения",
      color: stats.lowStockCount > 0 ? ("red" as const) : ("slate" as const),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((card, i) => (
        <StatCard key={card.label} {...card} delay={i * 0.04} />
      ))}
    </div>
  );
}

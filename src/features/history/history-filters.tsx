"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MOVEMENT_META, MOVEMENT_TYPES } from "@/constants/colors";
import type { Foreman, Material, Project, User } from "@/types";

export const PERIOD_OPTIONS = [
  { value: "all", label: "Всё время" },
  { value: "today", label: "Сегодня" },
  { value: "7", label: "Последние 7 дней" },
  { value: "30", label: "Последние 30 дней" },
  { value: "90", label: "Последние 90 дней" },
] as const;

interface HistoryFiltersProps {
  materials: Material[];
  foremen: Foreman[];
  users: User[];
  projects: Project[];
  current: Record<string, string>;
}

/**
 * Фильтры живут в адресной строке, а не в состоянии компонента:
 * отбор выполняется на сервере, ссылку можно переслать коллеге,
 * а обновление страницы не сбрасывает выбранные условия.
 */
export function HistoryFilters({ materials, foremen, users, projects, current }: HistoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    startTransition(() => router.replace(query ? `/history?${query}` : "/history", { scroll: false }));
  }

  const activeCount = ["type", "materialId", "foremanId", "userId", "projectId", "period"].filter(
    (key) => current[key] && current[key] !== "all"
  ).length;

  const filters: {
    key: string;
    width: string;
    placeholder: string;
    options: { value: string; label: string }[];
  }[] = [
    {
      key: "type",
      width: "w-full sm:w-44",
      placeholder: "Тип операции",
      options: [
        { value: "all", label: "Все типы" },
        ...MOVEMENT_TYPES.map((type) => ({ value: type, label: MOVEMENT_META[type].label })),
      ],
    },
    {
      key: "period",
      width: "w-full sm:w-44",
      placeholder: "Период",
      options: PERIOD_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
    },
    {
      key: "materialId",
      width: "w-full sm:w-52",
      placeholder: "Материал",
      options: [
        { value: "all", label: "Все материалы" },
        ...materials.map((m) => ({ value: m.id, label: m.name })),
      ],
    },
    {
      key: "foremanId",
      width: "w-full sm:w-48",
      placeholder: "Бригадир",
      options: [
        { value: "all", label: "Все бригадиры" },
        ...foremen.map((f) => ({ value: f.id, label: f.name })),
      ],
    },
    {
      key: "projectId",
      width: "w-full sm:w-52",
      placeholder: "Объект",
      options: [
        { value: "all", label: "Все объекты" },
        ...projects.map((p) => ({ value: p.id, label: p.name })),
      ],
    },
    {
      key: "userId",
      width: "w-full sm:w-48",
      placeholder: "Сотрудник",
      options: [
        { value: "all", label: "Все сотрудники" },
        ...users.map((u) => ({ value: u.id, label: u.fullName })),
      ],
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" data-pending={isPending || undefined}>
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={current[filter.key] || "all"}
          onValueChange={(value) => setParam(filter.key, value ?? "all")}
          items={Object.fromEntries(filter.options.map((o) => [o.value, o.label]))}
        >
          <SelectTrigger className={filter.width}>
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => startTransition(() => router.replace("/history", { scroll: false }))}
        >
          <X className="h-3.5 w-3.5" />
          Сбросить ({activeCount})
        </Button>
      )}
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MOVEMENT_TYPES } from "@/constants/colors";
import { useT } from "@/i18n/client";
import type { Foreman, Material, Project, User } from "@/types";

export const PERIOD_KEYS = ["all", "today", "7", "30", "90"] as const;

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
  const t = useT();

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

  const periodLabels: Record<string, string> = {
    all: t.periods.all,
    today: t.periods.today,
    "7": t.periods.days7,
    "30": t.periods.days30,
    "90": t.periods.days90,
  };

  const filters = [
    {
      key: "type",
      placeholder: t.history.filters.type,
      options: [
        { value: "all", label: t.history.filters.allTypes },
        ...MOVEMENT_TYPES.map((type) => ({ value: type, label: t.movements[type] })),
      ],
    },
    {
      key: "period",
      placeholder: t.common.period,
      options: PERIOD_KEYS.map((value) => ({ value, label: periodLabels[value] })),
    },
    {
      key: "materialId",
      placeholder: t.operations.material,
      options: [
        { value: "all", label: t.history.filters.allMaterials },
        ...materials.map((m) => ({ value: m.id, label: m.name })),
      ],
    },
    {
      key: "foremanId",
      placeholder: t.operations.foreman,
      options: [
        { value: "all", label: t.history.filters.allForemen },
        ...foremen.map((f) => ({ value: f.id, label: f.name })),
      ],
    },
    {
      key: "projectId",
      placeholder: t.operations.project,
      options: [
        { value: "all", label: t.history.filters.allProjects },
        ...projects.map((p) => ({ value: p.id, label: p.name })),
      ],
    },
    {
      key: "userId",
      placeholder: t.operations.employee,
      options: [
        { value: "all", label: t.history.filters.allUsers },
        ...users.map((u) => ({ value: u.id, label: u.fullName })),
      ],
    },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center"
      data-pending={isPending || undefined}
    >
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={current[filter.key] || "all"}
          onValueChange={(value) => setParam(filter.key, value ?? "all")}
          items={Object.fromEntries(filter.options.map((o) => [o.value, o.label]))}
        >
          <SelectTrigger className="w-full sm:w-[168px]" aria-label={filter.placeholder}>
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
          className="col-span-2 gap-1.5 text-muted-foreground sm:col-span-1"
          onClick={() => startTransition(() => router.replace("/history", { scroll: false }))}
        >
          <X className="h-3.5 w-3.5" />
          {t.history.filters.resetWithCount(activeCount)}
        </Button>
      )}
    </div>
  );
}

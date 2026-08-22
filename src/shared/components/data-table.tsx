"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
  /** Не показывать колонку в мобильных карточках (по умолчанию показывается). */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  /**
   * Разметка карточки для узкого экрана. Если задана, на телефонах вместо
   * таблицы с горизонтальной прокруткой показывается список карточек —
   * читать данные с телефона так намного удобнее.
   */
  mobileCard?: (row: T) => { title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode };
}

type SortDirection = "asc" | "desc" | null;

export function DataTable<T>({
  columns,
  data,
  rowKey,
  pageSize = 12,
  isLoading,
  emptyMessage,
  onRowClick,
  mobileCard,
}: DataTableProps<T>) {
  const { t, locale } = useI18n();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;
    const column = columns.find((c) => c.id === sortColumn);
    if (!column?.sortValue) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const va = column.sortValue!(a);
      const vb = column.sortValue!(b);
      if (typeof va === "number" && typeof vb === "number") {
        return sortDirection === "asc" ? va - vb : vb - va;
      }
      return sortDirection === "asc"
        ? String(va).localeCompare(String(vb), locale)
        : String(vb).localeCompare(String(va), locale);
    });
    return copy;
  }, [data, sortColumn, sortDirection, columns, locale]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
  const empty = emptyMessage ?? t.common.noData;

  function handleSort(column: DataTableColumn<T>) {
    if (!column.sortValue) return;
    if (sortColumn !== column.id) {
      setSortColumn(column.id);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
    setPage(0);
  }

  const pagination = !isLoading && sorted.length > 0 && (
    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
      <span className="text-[11px] text-muted-foreground">
        {t.common.shown} {currentPage * pageSize + 1}–
        {Math.min(sorted.length, (currentPage + 1) * pageSize)} {t.common.of} {sorted.length}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="←"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-1.5 text-[11px] tabular-nums text-muted-foreground">
            {currentPage + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            aria-label="→"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* --- Телефон: карточки вместо таблицы --- */}
      {mobileCard && (
        <div className="md:hidden">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`m-skeleton-${i}`} className="border-b border-border p-3 last:border-0">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </div>
            ))}

          {!isLoading && pageRows.length === 0 && <EmptyState message={empty} />}

          {!isLoading &&
            pageRows.map((row) => {
              const card = mobileCard(row);
              return (
                <div
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "flex items-start gap-3 border-b border-border px-3 py-3 last:border-0",
                    onRowClick && "cursor-pointer active:bg-muted/60"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium leading-snug">{card.title}</div>
                    {card.subtitle && (
                      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {card.subtitle}
                      </div>
                    )}
                  </div>
                  {card.trailing && <div className="shrink-0 text-right">{card.trailing}</div>}
                </div>
              );
            })}
        </div>
      )}

      {/* --- Планшет и десктоп: обычная таблица --- */}
      <div className={cn("overflow-x-auto", mobileCard && "hidden md:block")}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => {
                const active = sortColumn === column.id;
                return (
                  <TableHead
                    key={column.id}
                    aria-sort={
                      active ? (sortDirection === "asc" ? "ascending" : "descending") : undefined
                    }
                    className={cn(
                      "h-9 whitespace-nowrap bg-muted/40 text-[11px] font-medium uppercase tracking-[0.03em] text-muted-foreground",
                      column.headerClassName
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      >
                        {column.header}
                        {active ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-foreground" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-foreground" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
              {onRowClick && <TableHead className="w-8 bg-muted/40" aria-hidden />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-3.5 w-full max-w-28" />
                    </TableCell>
                  ))}
                  {onRowClick && <TableCell />}
                </TableRow>
              ))}

            {!isLoading && pageRows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length + (onRowClick ? 1 : 0)}
                  className="h-36 text-center"
                >
                  <EmptyState message={empty} />
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              pageRows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "text-[13px]",
                    onRowClick &&
                      "group/row cursor-pointer outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/30"
                  )}
                >
                  {columns.map((column) => (
                    <TableCell key={column.id} className={cn("py-2.5", column.className)}>
                      {column.accessor(row)}
                    </TableCell>
                  ))}
                  {onRowClick && (
                    <TableCell className="w-8 pr-3 text-right">
                      {/* Подсказка, что строку можно открыть. */}
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30 transition-colors group-hover/row:text-foreground" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {pagination}
    </div>
  );
}

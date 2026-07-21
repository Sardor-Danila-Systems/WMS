"use client";

import { useLoadingDelay } from "@/hooks/use-loading-delay";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardStatCards } from "./stat-cards";
import { ReceiptsIssuesChart } from "./receipts-issues-chart";
import { StockRatioChart } from "./stock-chart";
import { LowStockList } from "./low-stock-list";
import { RecentOperations } from "./recent-operations";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export function DashboardView() {
  const isLoading = useLoadingDelay(500);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <DashboardStatCards />
      <div className="grid gap-4 lg:grid-cols-2">
        <ReceiptsIssuesChart />
        <StockRatioChart />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <LowStockList />
        <RecentOperations />
      </div>
    </div>
  );
}

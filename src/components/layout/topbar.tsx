"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { NAV_ITEMS } from "@/constants/navigation";
import { MobileNav } from "./mobile-nav";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function useCurrentSectionLabel(pathname: string): string {
  if (pathname === "/") return "Дашборд";
  const match = [...NAV_ITEMS].sort((a, b) => b.href.length - a.href.length).find((item) => item.href !== "/" && pathname.startsWith(item.href));
  if (match) return match.label;
  return "СтройСклад WMS";
}

export function Topbar() {
  const pathname = usePathname();
  const label = useCurrentSectionLabel(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md supports-backdrop-filter:bg-background/60 sm:px-6">
      <MobileNav />
      <h1 className="text-sm font-semibold tracking-tight sm:text-base">{label}</h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Быстрый поиск по складу..."
            className="h-8 w-56 rounded-full border-transparent bg-muted/60 pl-8 text-xs focus-visible:bg-background"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 ring-2 ring-background" />
        </Button>
        <Avatar className="h-8 w-8 ring-2 ring-indigo-100">
          <AvatarFallback className="bg-linear-to-br from-indigo-500 to-violet-600 text-[11px] text-white">ДП</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

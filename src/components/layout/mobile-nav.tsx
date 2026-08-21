"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Boxes } from "lucide-react";

import { visibleGroups } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { isNavItemActive } from "./sidebar";

export function MobileNav({ role, companyName }: { role: Role; companyName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = visibleGroups(role);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Меню" />}>
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="h-16 flex-row items-center gap-2.5 space-y-0 border-b border-border px-5 py-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-4.5 w-4.5" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <SheetTitle className="text-sm">СтройСклад</SheetTitle>
            <span className="truncate text-[11px] text-muted-foreground">{companyName}</span>
          </div>
        </SheetHeader>
        <nav className="overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = isNavItemActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

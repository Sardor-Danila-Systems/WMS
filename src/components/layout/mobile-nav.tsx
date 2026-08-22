"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { useT } from "@/i18n/client";
import type { Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandMark, SidebarNav } from "./sidebar-nav";

export function MobileNav({ role, companyName }: { role: Role; companyName: string }) {
  const [open, setOpen] = useState(false);
  const t = useT();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="-ml-1.5 lg:hidden" aria-label={t("nav.menu")} />}
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[270px] flex-col p-0">
        <SheetHeader className="h-14 shrink-0 flex-row items-center space-y-0 border-b border-border px-4 py-0">
          <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
          <BrandMark companyName={companyName} />
        </SheetHeader>
        <SidebarNav role={role} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

"use client";

import type { Role } from "@/types";
import { BrandMark, SidebarNav } from "./sidebar-nav";

export function Sidebar({ role, companyName }: { role: Role; companyName: string }) {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <BrandMark companyName={companyName} />
      </div>
      <SidebarNav role={role} />
    </aside>
  );
}

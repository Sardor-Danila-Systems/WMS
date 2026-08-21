"use client";

import { usePathname } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";

import { sectionLabel } from "@/constants/navigation";
import { logout } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth/session";
import { MobileNav } from "./mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/constants/roles";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Topbar({ user, companyName }: { user: SessionUser; companyName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <MobileNav role={user.role} companyName={companyName} />
      <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
        {sectionLabel(pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden text-right leading-tight sm:block">
          <div className="text-xs font-medium">{user.fullName}</div>
          <div className="text-[11px] text-muted-foreground">{ROLE_LABELS[user.role]}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="h-9 w-9 rounded-full p-0" aria-label="Меню пользователя" />}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{user.fullName}</div>
              <div className="text-xs text-muted-foreground">
                {user.position || ROLE_LABELS[user.role]} · @{user.username}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon className="h-4 w-4" />
              {ROLE_LABELS[user.role]}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void logout();
              }}
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

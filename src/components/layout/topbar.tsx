"use client";

import { usePathname } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";

import { sectionKey } from "@/constants/navigation";
import { logout } from "@/app/actions/auth";
import { useT } from "@/i18n/client";
import type { SessionUser } from "@/lib/auth/session";
import { MobileNav } from "./mobile-nav";
import { LanguageSwitch } from "./language-switch";
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
  const t = useT();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-md sm:px-5">
      <MobileNav role={user.role} companyName={companyName} />
      <h1 className="truncate text-sm font-semibold tracking-tight">
        {t.nav[sectionKey(pathname)] as string}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <LanguageSwitch className="hidden sm:inline-flex" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="h-9 gap-2 px-1.5 sm:pr-2.5"
                aria-label={t.nav.userMenu}
              />
            }
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left leading-tight lg:block">
              <span className="block text-[12px] font-medium">{user.fullName}</span>
              <span className="block text-[11px] text-muted-foreground">
                {t.roles[user.role]}
              </span>
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{user.fullName}</div>
              <div className="text-xs text-muted-foreground">
                {user.position || t.roles[user.role]} · @{user.username}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon className="h-4 w-4" />
              {t.roles[user.role]}
            </DropdownMenuItem>
            {/* На узком экране переключатель языка живёт в этом меню. */}
            <div className="px-2 py-1.5 sm:hidden">
              <LanguageSwitch className="w-full justify-center" />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void logout();
              }}
            >
              <LogOut className="h-4 w-4" />
              {t.auth.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

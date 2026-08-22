"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, UserRound } from "lucide-react";

import { sectionKey } from "@/constants/navigation";
import { logout } from "@/app/actions/auth";
import { roleCan } from "@/lib/auth/permissions";
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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-md sm:px-5">
      <MobileNav role={user.role} companyName={companyName} />
      <h1 className="truncate text-[19px] font-semibold tracking-tight">
        {t(`nav.${sectionKey(pathname)}`)}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <LanguageSwitch className="hidden sm:inline-flex" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-11 gap-2.5 px-1.5 sm:pr-3" aria-label={t("nav.userMenu")} />
            }
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-[13px] font-semibold text-primary">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left leading-tight lg:block">
              <span className="block text-[15px] font-medium">{user.fullName}</span>
              {/* Логин виден сразу: по нему понятно, под какой учётной записью работаешь. */}
              <span className="block text-[13px] text-muted-foreground">@{user.username}</span>
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72">
            <div className="flex items-center gap-3 px-2 py-2.5">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-[14.5px] font-semibold text-primary">
                  {initials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-[16px] font-medium leading-tight">
                  {user.fullName}
                </div>
                <div className="truncate text-[14.5px] text-muted-foreground">@{user.username}</div>
              </div>
            </div>

            <div className="px-2 pb-2">
              <div className="flex items-center gap-1.5 rounded-md bg-muted/70 px-2.5 py-1.5 text-[13px] text-muted-foreground">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {user.position ? `${user.position} · ${t(`roles.${user.role}`)}` : t(`roles.${user.role}`)}
                </span>
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Переключатель языка нужен и на телефоне, где его нет в шапке. */}
            <div className="px-2 py-2 sm:hidden">
              <LanguageSwitch className="w-full justify-center" />
            </div>

            {roleCan(user.role, "settings:write") && (
              <DropdownMenuItem render={<Link href="/settings" />} className="text-[15px]">
                <Settings className="h-4 w-4" />
                {t("nav.settings")}
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              className="text-[15px]"
              onClick={() => {
                void logout();
              }}
            >
              <LogOut className="h-4 w-4" />
              {t("auth.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

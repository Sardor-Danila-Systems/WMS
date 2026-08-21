import type { ReactNode } from "react";

import type { SessionUser } from "@/lib/auth/session";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  children,
  user,
  companyName,
}: {
  children: ReactNode;
  user: SessionUser;
  companyName: string;
}) {
  return (
    <div className="flex h-full min-h-screen w-full bg-background">
      <Sidebar role={user.role} companyName={companyName} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar user={user} companyName={companyName} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

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
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar role={user.role} companyName={companyName} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar user={user} companyName={companyName} />
        <main className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-7 lg:py-7">{children}</main>
      </div>
    </div>
  );
}

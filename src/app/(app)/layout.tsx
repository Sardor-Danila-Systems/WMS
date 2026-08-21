import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth/dal";
import { AppShell } from "@/components/layout/app-shell";
import { getSetting } from "@/server/catalog";

/**
 * Общий каркас всех защищённых страниц. Сессия проверяется здесь, на сервере,
 * поэтому ни одна вложенная страница не может отрисоваться без пользователя.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const companyName = getSetting("company_name", "СтройСклад");

  return (
    <AppShell user={user} companyName={companyName}>
      {children}
    </AppShell>
  );
}

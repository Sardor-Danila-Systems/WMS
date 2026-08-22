import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

/**
 * Запись не найдена (например, открыли ссылку на удалённый материал).
 * Показывается внутри общего каркаса, чтобы у пользователя осталось
 * меню и он мог продолжить работу, а не оказался на пустой странице.
 */
export default async function AppNotFound() {
  const t = await getT();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileQuestion className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold tracking-tight">
          {t("errorPages.recordNotFoundTitle")}
        </h2>
        <p className="mt-2 text-[14.5px] text-muted-foreground">{t("errorPages.recordNotFoundHint")}</p>
        <Button render={<Link href="/" />} className="mt-5">
          {t("errorPages.toDashboard")}
        </Button>
      </div>
    </div>
  );
}

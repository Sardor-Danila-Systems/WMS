import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Запись не найдена (например, открыли ссылку на удалённый материал).
 * Показывается внутри общего каркаса, чтобы у пользователя осталось
 * меню и он мог продолжить работу, а не оказался на пустой странице.
 */
export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <FileQuestion className="h-5.5 w-5.5" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight">Запись не найдена</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Возможно, она была удалена или ссылка устарела.
        </p>
        <Button render={<Link href="/" />} className="mt-5">
          Вернуться на дашборд
        </Button>
      </div>
    </div>
  );
}

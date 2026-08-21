import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <FileQuestion className="h-5.5 w-5.5" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight">Страница не найдена</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Возможно, запись была удалена или ссылка устарела.
        </p>
        <Button render={<Link href="/" />} className="mt-5">
          Вернуться на дашборд
        </Button>
      </div>
    </div>
  );
}

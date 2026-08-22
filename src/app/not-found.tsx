import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDictionary } from "@/i18n/server";

export default async function NotFound() {
  const t = await getDictionary();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileQuestion className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold tracking-tight">{t.errorPages.notFoundTitle}</h2>
        <p className="mt-2 text-[13px] text-muted-foreground">{t.errorPages.notFoundHint}</p>
        <Button render={<Link href="/" />} className="mt-5">
          {t.errorPages.toDashboard}
        </Button>
      </div>
    </div>
  );
}

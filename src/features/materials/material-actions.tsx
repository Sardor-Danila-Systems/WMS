"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { removeMaterial } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import type { Material } from "@/types";

/**
 * Удаление доступно только администратору и только для материала без истории —
 * сервер всё равно откажет, но кнопку в этом случае лучше не показывать вовсе.
 */
export function MaterialDeleteButton({
  material,
  movementCount,
}: {
  material: Material;
  movementCount: number;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (movementCount > 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("common.delete")}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("materials.deleteTitle", { name: material.name })}
        description={t("materials.deleteHint")}
        successMessage={t("materials.deleted")}
        action={async () => {
          const result = await removeMaterial(material.id);
          if (result.ok) router.push("/materials");
          return result;
        }}
      />
    </>
  );
}

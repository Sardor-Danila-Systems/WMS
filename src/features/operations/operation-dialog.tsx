"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/client";
import type { MovementType } from "@/types";
import { ReceiptForm } from "./receipt-form";
import { IssueForm } from "./issue-form";
import { ReturnForm } from "./return-form";
import type { OperationRefData } from "./types";

/** Подписи диалога по типу операции. */
const DIALOG_KEYS: Record<MovementType, "receipt" | "issue" | "return"> = {
  RECEIPT: "receipt",
  ISSUE: "issue",
  RETURN: "return",
};

export function OperationDialog({
  type,
  data,
  variant = "default",
}: {
  type: MovementType;
  data: OperationRefData;
  variant?: "default" | "outline";
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const key = DIALOG_KEYS[type];
  const meta = {
    trigger: t(`operations.${key}.button`),
    title: t(`operations.${key}.dialogTitle`),
    description: t(`operations.${key}.dialogHint`),
  };
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={variant} className="gap-1.5" />}>
        <Plus className="h-3.5 w-3.5" />
        {meta.trigger}
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
        {type === "RECEIPT" && <ReceiptForm data={data} onSuccess={close} />}
        {type === "ISSUE" && <IssueForm data={data} onSuccess={close} />}
        {type === "RETURN" && <ReturnForm data={data} onSuccess={close} />}
      </DialogContent>
    </Dialog>
  );
}

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
import type { Dictionary } from "@/i18n/types";
import type { MovementType } from "@/types";
import { ReceiptForm } from "./receipt-form";
import { IssueForm } from "./issue-form";
import { UsageForm } from "./usage-form";
import { ReturnForm } from "./return-form";
import type { OperationRefData } from "./types";

/** Подписи диалога по типу операции берутся из словаря. */
function dialogMeta(t: Dictionary, type: MovementType) {
  const map: Record<MovementType, { trigger: string; title: string; description: string }> = {
    RECEIPT: {
      trigger: t.operations.receipt.button,
      title: t.operations.receipt.dialogTitle,
      description: t.operations.receipt.dialogHint,
    },
    ISSUE: {
      trigger: t.operations.issue.button,
      title: t.operations.issue.dialogTitle,
      description: t.operations.issue.dialogHint,
    },
    USAGE: {
      trigger: t.operations.usage.button,
      title: t.operations.usage.dialogTitle,
      description: t.operations.usage.dialogHint,
    },
    RETURN: {
      trigger: t.operations.return.button,
      title: t.operations.return.dialogTitle,
      description: t.operations.return.dialogHint,
    },
  };
  return map[type];
}

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
  const meta = dialogMeta(t, type);
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
        {type === "USAGE" && <UsageForm data={data} onSuccess={close} />}
        {type === "RETURN" && <ReturnForm data={data} onSuccess={close} />}
      </DialogContent>
    </Dialog>
  );
}

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
import type { MovementType } from "@/types";
import { ReceiptForm } from "./receipt-form";
import { IssueForm } from "./issue-form";
import { UsageForm } from "./usage-form";
import { ReturnForm } from "./return-form";
import type { OperationRefData } from "./types";

const DIALOG_META: Record<
  MovementType,
  { trigger: string; title: string; description: string }
> = {
  RECEIPT: {
    trigger: "Новое поступление",
    title: "Приём материала на склад",
    description: "Остаток склада увеличится сразу после сохранения.",
  },
  ISSUE: {
    trigger: "Новая выдача",
    title: "Выдача материала бригаде",
    description: "Материал спишется со склада и закрепится за бригадиром.",
  },
  USAGE: {
    trigger: "Списать на объект",
    title: "Использование материала на стройке",
    description: "Списывается остаток, числящийся за бригадиром. Склад не затрагивается.",
  },
  RETURN: {
    trigger: "Новый возврат",
    title: "Возврат материала на склад",
    description: "Материал вернётся на склад и спишется с остатка бригадира.",
  },
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
  const [open, setOpen] = useState(false);
  const meta = DIALOG_META[type];
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={variant} className="gap-1.5" />}>
        <Plus className="h-3.5 w-3.5" />
        {meta.trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
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

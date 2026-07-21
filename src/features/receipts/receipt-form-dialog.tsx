"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ReceiptForm } from "./receipt-form";

export function ReceiptFormDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="h-3.5 w-3.5" />
        Новое поступление
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Новое поступление материала</DialogTitle>
          <DialogDescription>Заполните данные о поставке — остаток обновится автоматически.</DialogDescription>
        </DialogHeader>
        <ReceiptForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

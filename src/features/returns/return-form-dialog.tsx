"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ReturnForm } from "./return-form";

export function ReturnFormDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="h-3.5 w-3.5" />
        Новый возврат
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Возврат материала на склад</DialogTitle>
          <DialogDescription>Остаток на складе увеличится сразу после сохранения.</DialogDescription>
        </DialogHeader>
        <ReturnForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

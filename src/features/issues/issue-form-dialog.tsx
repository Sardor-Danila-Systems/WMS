"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { IssueForm } from "./issue-form";

export function IssueFormDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="h-3.5 w-3.5" />
        Новая выдача
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Выдача материала бригаде</DialogTitle>
          <DialogDescription>Остаток на складе уменьшится сразу после сохранения.</DialogDescription>
        </DialogHeader>
        <IssueForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

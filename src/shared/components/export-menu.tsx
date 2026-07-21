"use client";

import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ExportMenuProps {
  onExportCsv: () => void;
  onExportXlsx: () => void;
  label?: string;
}

export function ExportMenu({ onExportCsv, onExportXlsx, label = "Экспорт" }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Download className="h-3.5 w-3.5" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => {
            onExportXlsx();
            toast.success("Файл Excel сформирован");
          }}
        >
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onExportCsv();
            toast.success("Файл CSV сформирован");
          }}
        >
          <FileText className="h-4 w-4 text-blue-600" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled
          onClick={() => toast.info("Экспорт в PDF появится в следующей версии")}
        >
          <FileType className="h-4 w-4 text-red-600" />
          PDF
          <span className="ml-auto text-[10px] text-muted-foreground">скоро</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

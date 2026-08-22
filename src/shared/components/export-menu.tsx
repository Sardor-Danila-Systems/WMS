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
import { useT } from "@/i18n/client";

interface ExportMenuProps {
  onExportCsv: () => void;
  onExportXlsx: () => void;
  label?: string;
}

export function ExportMenu({ onExportCsv, onExportXlsx, label }: ExportMenuProps) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Download className="h-3.5 w-3.5" />
        {label ?? t.common.export}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => {
            onExportXlsx();
            toast.success(t.reports.export.excelDone);
          }}
        >
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          {t.reports.export.excel}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onExportCsv();
            toast.success(t.reports.export.csvDone);
          }}
        >
          <FileText className="h-4 w-4 text-blue-600" />
          {t.reports.export.csv}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled
          onClick={() => toast.info(t.reports.export.pdfSoon)}
        >
          <FileType className="h-4 w-4 text-red-600" />
          {t.reports.export.pdf}
          <span className="ml-auto text-[10px] text-muted-foreground">{t.reports.export.soon}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

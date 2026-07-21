"use client";

import { useMemo } from "react";
import { useWarehouseStore } from "@/store/warehouse-store";
import { getStockStatus } from "@/constants/colors";
import { CATEGORIES } from "@/constants/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ReportPreviewTable() {
  const materials = useWarehouseStore((s) => s.materials);

  const rows = useMemo(() => {
    return CATEGORIES.map((category) => {
      const items = materials.filter((m) => m.category === category);
      const lowStock = items.filter((m) => getStockStatus(m.quantity, m.minStock) !== "good").length;
      return { category, count: items.length, lowStock };
    }).filter((row) => row.count > 0);
  }, [materials]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Сводка по категориям</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground">Категория</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Наименований</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">С низким остатком</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.category}>
                <TableCell className="font-medium">{row.category}</TableCell>
                <TableCell className="tabular-nums">{row.count}</TableCell>
                <TableCell className="tabular-nums">
                  {row.lowStock > 0 ? (
                    <span className="text-amber-700">{row.lowStock}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

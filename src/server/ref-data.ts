import "@/lib/server-only";

import { db } from "@/lib/db/client";
import type { ForemanStockRow } from "@/types";
import type { OperationRefData } from "@/features/operations/types";
import { listForemen, listMaterials, listProjects, listSuppliers } from "./queries";

/**
 * Справочники для форм операций одним набором.
 * Остатки бригадиров загружаются целиком: форма использования и возврата
 * должна показывать доступное количество сразу при выборе бригадира,
 * без дополнительного запроса на сервер.
 */
export async function getOperationRefData(): Promise<OperationRefData> {
  const stockRows = await db.foremanStock.findMany({
    where: { quantity: { gt: 0 } },
    include: { material: { select: { name: true, unit: true } } },
    orderBy: { material: { name: "asc" } },
  });

  const foremanStock: Record<string, ForemanStockRow[]> = {};
  for (const row of stockRows) {
    (foremanStock[row.foremanId] ??= []).push({
      foremanId: row.foremanId,
      materialId: row.materialId,
      materialName: row.material.name,
      unit: row.material.unit,
      quantity: row.quantity,
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  // Справочники не зависят друг от друга — загружаем их параллельно,
  // чтобы форма открывалась за один круг обращений к базе, а не за четыре.
  const [materials, foremen, projects, suppliers] = await Promise.all([
    listMaterials(),
    listForemen(),
    listProjects(),
    listSuppliers(),
  ]);

  return { materials, foremen, projects, suppliers, foremanStock };
}

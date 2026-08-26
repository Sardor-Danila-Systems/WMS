import "@/lib/server-only";

import { db } from "@/lib/db/client";
import type { BlockStockRow } from "@/types";
import type { OperationRefData } from "@/features/operations/types";
import { listBlocks, listMaterials, listOrganizations, listSuppliers } from "./queries";

/**
 * Справочники для форм операций одним набором.
 * Остатки блоков загружаются целиком: форма возврата должна показывать
 * доступное количество сразу при выборе блока, без отдельного запроса.
 */
export async function getOperationRefData(): Promise<OperationRefData> {
  const stockRows = await db.blockStock.findMany({
    where: { quantity: { gt: 0 } },
    include: { material: { select: { name: true, unit: true } } },
    orderBy: { material: { name: "asc" } },
  });

  const blockStock: Record<string, BlockStockRow[]> = {};
  for (const row of stockRows) {
    (blockStock[row.blockId] ??= []).push({
      blockId: row.blockId,
      materialId: row.materialId,
      materialName: row.material.name,
      unit: row.material.unit,
      quantity: row.quantity,
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  // Справочники не зависят друг от друга — загружаем их параллельно,
  // чтобы форма открывалась за один круг обращений к базе, а не за четыре.
  const [materials, blocks, organizations, suppliers] = await Promise.all([
    listMaterials(),
    listBlocks(),
    listOrganizations(),
    listSuppliers(),
  ]);

  return { materials, blocks, organizations, suppliers, blockStock };
}

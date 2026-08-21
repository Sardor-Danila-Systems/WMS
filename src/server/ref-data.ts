import "@/lib/server-only";

import { queryAll } from "@/lib/db/client";
import type { ForemanStockRow } from "@/types";
import type { OperationRefData } from "@/features/operations/types";
import { listForemen, listMaterials, listProjects, listSuppliers } from "./queries";

/**
 * Справочники для форм операций одним набором.
 * Остатки бригадиров загружаются целиком: форма использования и возврата
 * должна показывать доступное количество сразу при выборе бригадира,
 * без дополнительного запроса на сервер.
 */
export function getOperationRefData(): OperationRefData {
  const stockRows = queryAll<ForemanStockRow>(
    `SELECT fs.foreman_id AS foremanId, fs.material_id AS materialId,
            m.name AS materialName, m.unit, fs.quantity, fs.updated_at AS updatedAt
       FROM foreman_stock fs
       JOIN materials m ON m.id = fs.material_id
      WHERE fs.quantity > 0
      ORDER BY m.name COLLATE NOCASE`
  );

  const foremanStock: Record<string, ForemanStockRow[]> = {};
  for (const row of stockRows) {
    (foremanStock[row.foremanId] ??= []).push(row);
  }

  return {
    materials: listMaterials(),
    foremen: listForemen(),
    projects: listProjects(),
    suppliers: listSuppliers(),
    foremanStock,
  };
}

import type { Block, BlockStockRow, Material, Organization, Supplier } from "@/types";

/** Справочные данные, нужные формам операций. Загружаются на сервере один раз. */
export interface OperationRefData {
  materials: Material[];
  blocks: Block[];
  organizations: Organization[];
  suppliers: Supplier[];
  /** Что сейчас числится за каждым блоком: blockId → позиции. */
  blockStock: Record<string, BlockStockRow[]>;
}

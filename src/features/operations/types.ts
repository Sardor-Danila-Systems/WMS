import type { Foreman, ForemanStockRow, Material, Project, Supplier } from "@/types";

/** Справочные данные, нужные формам операций. Загружаются на сервере один раз. */
export interface OperationRefData {
  materials: Material[];
  foremen: Foreman[];
  projects: Project[];
  suppliers: Supplier[];
  /** Что сейчас на руках у каждого бригадира: foremanId → позиции. */
  foremanStock: Record<string, ForemanStockRow[]>;
}

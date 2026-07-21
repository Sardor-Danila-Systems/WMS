import type { Unit } from "./material";

export type OperationType = "receipt" | "issue" | "return";

export type ReturnReason =
  | "Излишек на объекте"
  | "Брак/повреждение"
  | "Неверный материал"
  | "Отмена работ";

export interface Operation {
  id: string;
  type: OperationType;
  date: string;
  materialId: string;
  materialName: string;
  unit: Unit;
  quantity: number;
  workerId: string;
  /** Поставщик для поступления, бригадир для выдачи/возврата */
  counterpartyId: string;
  counterpartyName: string;
  comment?: string;
  vehicleNumber?: string;
  reason?: ReturnReason;
}

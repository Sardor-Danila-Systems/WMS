export type Role = "ADMIN" | "WAREHOUSE_WORKER";

export interface User {
  id: string;
  username: string;
  fullName: string;
  position: string;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  inn: string;
  isActive: boolean;
  createdAt: string;
}

/** Организация — юрлицо, на балансе которого числится материал. */
export interface Organization {
  id: string;
  name: string;
  address: string;
  inn: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

/** Блок стройки (A, B, C, D, E) — получатель материала со склада. */
export interface Block {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  organizationId: string | null;
  organizationName: string | null;
  isActive: boolean;
  createdAt: string;
}

/** Строка «что числится за блоком»: выдано и ещё не возвращено. */
export interface BlockStockRow {
  blockId: string;
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  updatedAt: string;
}

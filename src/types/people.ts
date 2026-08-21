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
  isActive: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
  createdAt: string;
}

export interface Foreman {
  id: string;
  name: string;
  phone: string;
  brigade: string;
  projectId: string | null;
  projectName: string | null;
  isActive: boolean;
  createdAt: string;
}

/** Строка «что сейчас на руках у бригадира». */
export interface ForemanStockRow {
  foremanId: string;
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  updatedAt: string;
}

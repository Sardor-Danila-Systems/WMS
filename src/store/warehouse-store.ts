"use client";

import { create } from "zustand";
import type { Foreman, Material, Operation, ReturnReason, Supplier, Worker } from "@/types";
import { SEED_FOREMEN, SEED_MATERIALS, SEED_OPERATIONS, SEED_SUPPLIERS, SEED_WORKERS } from "@/lib/mock/seed";

interface AddReceiptInput {
  materialId: string;
  quantity: number;
  supplierId: string;
  workerId: string;
  date: string;
  vehicleNumber: string;
  comment?: string;
}

interface IssueMaterialInput {
  materialId: string;
  quantity: number;
  foremanId: string;
  workerId: string;
  date: string;
  comment?: string;
}

interface ReturnMaterialInput {
  materialId: string;
  quantity: number;
  foremanId: string;
  workerId: string;
  date: string;
  reason: ReturnReason;
  comment?: string;
}

interface WarehouseState {
  materials: Material[];
  operations: Operation[];
  suppliers: Supplier[];
  workers: Worker[];
  foremen: Foreman[];
  addReceipt: (input: AddReceiptInput) => void;
  issueMaterial: (input: IssueMaterialInput) => { success: boolean; error?: string };
  returnMaterial: (input: ReturnMaterialInput) => void;
}

function generateOperationId() {
  return `op-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  materials: SEED_MATERIALS,
  operations: SEED_OPERATIONS,
  suppliers: SEED_SUPPLIERS,
  workers: SEED_WORKERS,
  foremen: SEED_FOREMEN,

  addReceipt: (input) => {
    const material = get().materials.find((m) => m.id === input.materialId);
    const supplier = get().suppliers.find((s) => s.id === input.supplierId);
    if (!material || !supplier) return;

    const operation: Operation = {
      id: generateOperationId(),
      type: "receipt",
      date: input.date,
      materialId: material.id,
      materialName: material.name,
      unit: material.unit,
      quantity: input.quantity,
      workerId: input.workerId,
      counterpartyId: supplier.id,
      counterpartyName: supplier.name,
      comment: input.comment,
      vehicleNumber: input.vehicleNumber,
    };

    set((state) => ({
      operations: [operation, ...state.operations],
      materials: state.materials.map((m) =>
        m.id === material.id
          ? { ...m, quantity: m.quantity + input.quantity, lastReceiptDate: input.date }
          : m
      ),
    }));
  },

  issueMaterial: (input) => {
    const material = get().materials.find((m) => m.id === input.materialId);
    const foreman = get().foremen.find((f) => f.id === input.foremanId);
    if (!material || !foreman) return { success: false, error: "Материал или бригадир не найдены" };
    if (input.quantity > material.quantity) {
      return { success: false, error: `Недостаточно остатка: доступно ${material.quantity} ${material.unit}` };
    }

    const operation: Operation = {
      id: generateOperationId(),
      type: "issue",
      date: input.date,
      materialId: material.id,
      materialName: material.name,
      unit: material.unit,
      quantity: input.quantity,
      workerId: input.workerId,
      counterpartyId: foreman.id,
      counterpartyName: foreman.name,
      comment: input.comment,
    };

    set((state) => ({
      operations: [operation, ...state.operations],
      materials: state.materials.map((m) =>
        m.id === material.id ? { ...m, quantity: m.quantity - input.quantity } : m
      ),
    }));

    return { success: true };
  },

  returnMaterial: (input) => {
    const material = get().materials.find((m) => m.id === input.materialId);
    const foreman = get().foremen.find((f) => f.id === input.foremanId);
    if (!material || !foreman) return;

    const operation: Operation = {
      id: generateOperationId(),
      type: "return",
      date: input.date,
      materialId: material.id,
      materialName: material.name,
      unit: material.unit,
      quantity: input.quantity,
      workerId: input.workerId,
      counterpartyId: foreman.id,
      counterpartyName: foreman.name,
      comment: input.comment,
      reason: input.reason,
    };

    set((state) => ({
      operations: [operation, ...state.operations],
      materials: state.materials.map((m) =>
        m.id === material.id ? { ...m, quantity: m.quantity + input.quantity } : m
      ),
    }));
  },
}));

"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useWarehouseStore } from "@/store/warehouse-store";
import { FormField } from "@/shared/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";

const receiptSchema = z.object({
  vehicleNumber: z.string().min(4, "Укажите номер машины"),
  supplierId: z.string().min(1, "Выберите поставщика"),
  materialId: z.string().min(1, "Выберите материал"),
  quantity: z.coerce.number({ error: "Введите количество" }).positive("Количество должно быть больше 0"),
  workerId: z.string().min(1, "Выберите работника склада"),
  date: z.string().min(1, "Укажите дату"),
  comment: z.string().optional(),
});

type ReceiptFormValues = z.infer<typeof receiptSchema>;

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export function ReceiptForm({ onSuccess }: { onSuccess: () => void }) {
  const materials = useWarehouseStore((s) => s.materials);
  const suppliers = useWarehouseStore((s) => s.suppliers);
  const workers = useWarehouseStore((s) => s.workers);
  const addReceipt = useWarehouseStore((s) => s.addReceipt);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      vehicleNumber: "",
      supplierId: "",
      materialId: "",
      quantity: undefined,
      workerId: "",
      date: todayISODate(),
      comment: "",
    },
  });

  const selectedMaterial = materials.find((m) => m.id === watch("materialId"));

  function onSubmit(values: ReceiptFormValues) {
    addReceipt({
      materialId: values.materialId,
      quantity: values.quantity,
      supplierId: values.supplierId,
      workerId: values.workerId,
      date: new Date(values.date).toISOString(),
      vehicleNumber: values.vehicleNumber,
      comment: values.comment,
    });
    toast.success("Поступление сохранено", {
      description: `Остаток «${selectedMaterial?.name}» увеличен на ${values.quantity} ${selectedMaterial?.unit}`,
    });
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Номер машины" required error={errors.vehicleNumber?.message}>
          <Input placeholder="А123ВС 77" {...register("vehicleNumber")} />
        </FormField>

        <FormField label="Поставщик" required error={errors.supplierId?.message}>
          <Controller
            control={control}
            name="supplierId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите поставщика" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>

      <FormField label="Материал" required error={errors.materialId?.message}>
        <Controller
          control={control}
          name="materialId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите материал" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Количество" required error={errors.quantity?.message}>
          <div className="relative">
            <Input type="number" step="any" placeholder="0" {...register("quantity")} />
            {selectedMaterial && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {selectedMaterial.unit}
              </span>
            )}
          </div>
        </FormField>

        <FormField label="Дата" required error={errors.date?.message}>
          <Input type="date" {...register("date")} />
        </FormField>
      </div>

      <FormField label="Работник склада" required error={errors.workerId?.message}>
        <Controller
          control={control}
          name="workerId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Кто принял поставку" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField label="Комментарий" error={errors.comment?.message}>
        <Textarea placeholder="Необязательно" rows={2} {...register("comment")} />
      </FormField>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          Сохранить поступление
        </Button>
      </DialogFooter>
    </form>
  );
}

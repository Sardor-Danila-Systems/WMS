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

const issueSchema = z.object({
  foremanId: z.string().min(1, "Выберите бригадира"),
  materialId: z.string().min(1, "Выберите материал"),
  quantity: z.coerce.number({ error: "Введите количество" }).positive("Количество должно быть больше 0"),
  workerId: z.string().min(1, "Выберите работника склада"),
  date: z.string().min(1, "Укажите дату"),
  comment: z.string().optional(),
});

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export function IssueForm({ onSuccess }: { onSuccess: () => void }) {
  const materials = useWarehouseStore((s) => s.materials);
  const foremen = useWarehouseStore((s) => s.foremen);
  const workers = useWarehouseStore((s) => s.workers);
  const issueMaterial = useWarehouseStore((s) => s.issueMaterial);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      foremanId: "",
      materialId: "",
      quantity: undefined,
      workerId: "",
      date: todayISODate(),
      comment: "",
    },
  });

  const selectedMaterial = materials.find((m) => m.id === watch("materialId"));

  function onSubmit(values: z.infer<typeof issueSchema>) {
    const result = issueMaterial({
      materialId: values.materialId,
      quantity: values.quantity,
      foremanId: values.foremanId,
      workerId: values.workerId,
      date: new Date(values.date).toISOString(),
      comment: values.comment,
    });

    if (!result.success) {
      setError("quantity", { message: result.error });
      toast.error("Не удалось выдать материал", { description: result.error });
      return;
    }

    toast.success("Выдача оформлена", {
      description: `Остаток «${selectedMaterial?.name}» уменьшен на ${values.quantity} ${selectedMaterial?.unit}`,
    });
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Бригадир" required error={errors.foremanId?.message}>
        <Controller
          control={control}
          name="foremanId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Кому выдаём материал" />
              </SelectTrigger>
              <SelectContent>
                {foremen.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} · {f.brigade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

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
        {selectedMaterial && (
          <p className="text-xs text-muted-foreground">
            Доступно: {selectedMaterial.quantity} {selectedMaterial.unit}
          </p>
        )}
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
                <SelectValue placeholder="Кто выдал материал" />
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
          Оформить выдачу
        </Button>
      </DialogFooter>
    </form>
  );
}

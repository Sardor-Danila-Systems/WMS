"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";

import { saveUser } from "@/app/actions/catalog";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_OPTIONS } from "@/constants/roles";
import { FormField } from "@/shared/components/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SelectField } from "@/features/operations/fields";
import { useActionSubmit } from "@/features/operations/use-operation-form";
import type { Role, User } from "@/types";

interface Values {
  id?: string;
  username: string;
  fullName: string;
  position: string;
  phone: string;
  role: Role | "";
  password: string;
  isActive: boolean;
}

/**
 * Сотрудник склада и учётная запись — одна сущность: тот, кто проводит
 * операцию, и есть тот, кто вошёл в систему. Отдельного справочника
 * работников нет намеренно, иначе «кто принял материал» пришлось бы вводить руками.
 */
export function UserFormDialog({ user }: { user?: User }) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(user);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({
    defaultValues: {
      username: user?.username ?? "",
      fullName: user?.fullName ?? "",
      position: user?.position ?? "",
      phone: user?.phone ?? "",
      role: user?.role ?? "WAREHOUSE_WORKER",
      password: "",
      isActive: user?.isActive ?? true,
    },
  });

  const { submit, isPending } = useActionSubmit<Values>({
    action: saveUser,
    setError,
    successTitle: isEdit ? "Данные сотрудника обновлены" : "Сотрудник добавлен",
    onSuccess: () => {
      setOpen(false);
      if (!isEdit) reset();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant={isEdit ? "outline" : "default"} className="gap-1.5" />}
      >
        {isEdit ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {isEdit ? "Редактировать" : "Добавить сотрудника"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактирование сотрудника" : "Новый сотрудник"}</DialogTitle>
          <DialogDescription>
            Сотрудник входит в систему под своим логином — по нему видно, кто провёл операцию.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => submit({ ...values, id: user?.id }))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="ФИО" required error={errors.fullName?.message}>
              <Input
                placeholder="Иван Иванов"
                autoFocus
                disabled={isPending}
                aria-invalid={Boolean(errors.fullName)}
                {...register("fullName")}
              />
            </FormField>

            <FormField label="Логин" required={!isEdit} error={errors.username?.message}>
              <Input
                placeholder="ivanov"
                autoComplete="off"
                disabled={isPending || isEdit}
                aria-invalid={Boolean(errors.username)}
                {...register("username")}
              />
              {isEdit && <p className="text-xs text-muted-foreground">Логин изменить нельзя</p>}
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Должность" error={errors.position?.message}>
              <Input placeholder="Кладовщик" disabled={isPending} {...register("position")} />
            </FormField>

            <FormField label="Телефон" error={errors.phone?.message}>
              <Input placeholder="+7 (900) 000-00-00" disabled={isPending} {...register("phone")} />
            </FormField>
          </div>

          <SelectField
            control={control}
            name="role"
            label="Роль"
            placeholder="Выберите роль"
            required
            error={errors.role?.message}
            disabled={isPending}
            options={ROLE_OPTIONS.map((role) => ({
              value: role,
              label: ROLE_LABELS[role],
              hint: role === "ADMIN" ? "полный доступ" : "операции",
            }))}
          >
            <p className="text-xs text-muted-foreground">
              {ROLE_DESCRIPTIONS.WAREHOUSE_WORKER}
            </p>
          </SelectField>

          <FormField
            label={isEdit ? "Новый пароль" : "Пароль"}
            required={!isEdit}
            error={errors.password?.message}
          >
            <Input
              type="password"
              autoComplete="new-password"
              placeholder={isEdit ? "Оставьте пустым, чтобы не менять" : "Минимум 6 символов"}
              disabled={isPending}
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
          </FormField>

          {isEdit && (
            <FormField label="Доступ">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  disabled={isPending}
                  {...register("isActive")}
                />
                Сотрудник активен и может входить в систему
              </label>
            </FormField>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохраняем..." : isEdit ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";

import { saveUser } from "@/app/actions/catalog";
import { useT } from "@/i18n/client";
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
  const t = useT();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(user);
  const roleOptions: Role[] = ["ADMIN", "WAREHOUSE_WORKER"];

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
    successTitle: isEdit ? t.users.saved : t.users.created,
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
        {isEdit ? t.common.edit : t.users.add}
      </DialogTrigger>

      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t.users.edit : t.users.create}</DialogTitle>
          <DialogDescription>
            {t.users.hint}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => submit({ ...values, id: user?.id }))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.users.fullName} required error={errors.fullName?.message}>
              <Input
                placeholder={t.users.namePlaceholder}
                autoFocus
                disabled={isPending}
                aria-invalid={Boolean(errors.fullName)}
                {...register("fullName")}
              />
            </FormField>

            <FormField label={t.users.login} required={!isEdit} error={errors.username?.message}>
              <Input
                placeholder={t.users.loginPlaceholder}
                autoComplete="off"
                disabled={isPending || isEdit}
                aria-invalid={Boolean(errors.username)}
                {...register("username")}
              />
              {isEdit && <p className="text-xs text-muted-foreground">{t.users.loginLocked}</p>}
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t.users.position} error={errors.position?.message}>
              <Input placeholder={t.users.positionPlaceholder} disabled={isPending} {...register("position")} />
            </FormField>

            <FormField label={t.users.phone} error={errors.phone?.message}>
              <Input placeholder="+7 (900) 000-00-00" disabled={isPending} {...register("phone")} />
            </FormField>
          </div>

          <SelectField
            control={control}
            name="role"
            label={t.roles.title}
            placeholder={t.users.rolePlaceholder}
            required
            error={errors.role?.message}
            disabled={isPending}
            options={roleOptions.map((role) => ({
              value: role,
              label: t.roles[role],
              hint: role === "ADMIN" ? t.users.roleFullAccess : t.users.roleOperations,
            }))}
          >
            <p className="text-xs text-muted-foreground">
              {t.roles.descriptions.WAREHOUSE_WORKER}
            </p>
          </SelectField>

          <FormField
            label={isEdit ? t.users.newPassword : t.auth.password}
            required={!isEdit}
            error={errors.password?.message}
          >
            <Input
              type="password"
              autoComplete="new-password"
              placeholder={isEdit ? t.users.passwordKeep : t.users.passwordMin}
              disabled={isPending}
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
          </FormField>

          {isEdit && (
            <FormField label={t.users.accessLabel}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  disabled={isPending}
                  {...register("isActive")}
                />
                {t.users.activeLabel}
              </label>
            </FormField>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? t.common.saving : isEdit ? t.common.save : t.common.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

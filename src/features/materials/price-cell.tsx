"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { saveMaterialPrice } from "@/app/actions/catalog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { useIntlTag, useT } from "@/i18n/client";
import type { Material } from "@/types";

/**
 * Цена прямо в строке таблицы: клик по карандашу — поле ввода, Enter — сохранение.
 * Цены правят часто и по одной, и открывать ради этого карточку материала
 * было бы лишним шагом.
 */
export function PriceCell({ material, canEdit }: { material: Material; canEdit: boolean }) {
  const t = useT();
  const locale = useIntlTag();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(material.price || ""));
  const [isPending, setIsPending] = useState(false);

  // Цена могла измениться приходом — пока строку не правят, показываем свежее
  // значение. Правка во время рендера, а не в эффекте: лишнего прохода нет,
  // и введённый текст не затирается на полуслове.
  const [knownPrice, setKnownPrice] = useState(material.price);
  if (!editing && knownPrice !== material.price) {
    setKnownPrice(material.price);
    setValue(String(material.price || ""));
  }

  async function save() {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error(t("validation.priceNonNegative"));
      return;
    }
    if (parsed === material.price) {
      setEditing(false);
      return;
    }

    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append("id", material.id);
      formData.append("price", String(parsed));
      const result = await saveMaterialPrice(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("money.priceUpdated"), { description: material.name });
      setEditing(false);
    } catch {
      toast.error(t("common.serverUnavailable"));
    } finally {
      setIsPending(false);
    }
  }

  function cancel() {
    setValue(String(material.price || ""));
    setEditing(false);
  }

  if (!editing) {
    return (
      <div
        className="flex items-center justify-end gap-1.5"
        // Строка материала открывает карточку — правка цены не должна уводить со списка.
        onClick={(event) => event.stopPropagation()}
      >
        <span className="whitespace-nowrap tabular-nums">
          {material.price > 0 ? (
            formatMoney(material.price, locale)
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
            aria-label={t("money.editPrice")}
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      <Input
        type="number"
        step="any"
        min="0"
        inputMode="decimal"
        value={value}
        autoFocus
        disabled={isPending}
        onFocus={(event) => event.target.select()}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void save();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        className="h-7 w-28 text-right tabular-nums"
        aria-label={t("money.price")}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        disabled={isPending}
        aria-label={t("common.save")}
        onClick={() => void save()}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground"
        disabled={isPending}
        aria-label={t("common.cancel")}
        onClick={cancel}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

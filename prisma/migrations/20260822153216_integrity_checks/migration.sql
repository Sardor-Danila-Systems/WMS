-- Ограничения целостности учёта.
--
-- Prisma не умеет описывать CHECK в schema.prisma, поэтому они заданы SQL-ом.
-- Это последний рубеж защиты: даже при ошибке в коде приложения база
-- не даст записать отрицательный остаток или операцию с нулевым количеством.

-- Остатки не могут быть отрицательными.
ALTER TABLE "materials"
  ADD CONSTRAINT "materials_quantity_non_negative" CHECK ("quantity" >= 0),
  ADD CONSTRAINT "materials_min_stock_non_negative" CHECK ("min_stock" >= 0);

ALTER TABLE "foreman_stock"
  ADD CONSTRAINT "foreman_stock_quantity_non_negative" CHECK ("quantity" >= 0);

-- Количество в движении всегда строго положительное: направление операции
-- задаётся её типом и полями *_delta, а не знаком количества.
ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "stock_movements_warehouse_after_non_negative" CHECK ("warehouse_after" >= 0),
  ADD CONSTRAINT "stock_movements_foreman_after_non_negative"
    CHECK ("foreman_after" IS NULL OR "foreman_after" >= 0),
  -- Операциям с бригадиром бригадир обязателен, поступлению — нет.
  ADD CONSTRAINT "stock_movements_foreman_required"
    CHECK ("type" = 'RECEIPT' OR "foreman_id" IS NOT NULL);

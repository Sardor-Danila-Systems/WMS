-- Переход на учёт по блокам и организациям.
--
--  • Бригадиры (foremen) заменены блоками стройки A–E (blocks);
--  • Объекты (projects) заменены организациями (organizations);
--  • Операция USAGE убрана — расходом считается сама выдача в блок;
--  • В движении появились цена, сумма, номер фактуры и способ оплаты;
--  • Поля external_id подготовлены под импорт из 1С.
--
-- Старые таблицы удаляются, а не переименовываются: на момент миграции
-- в них нет ни одной строки, а перенос пустых данных только запутал бы
-- историю миграций.

-- Ограничения, завязанные на удаляемые столбцы, снимаем явно —
-- чтобы миграция не зависела от каскадного поведения DROP COLUMN.
ALTER TABLE "stock_movements"
  DROP CONSTRAINT IF EXISTS "stock_movements_foreman_after_non_negative",
  DROP CONSTRAINT IF EXISTS "stock_movements_foreman_required";

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER');

-- AlterEnum
BEGIN;
CREATE TYPE "MovementType_new" AS ENUM ('RECEIPT', 'ISSUE', 'RETURN');
ALTER TABLE "stock_movements" ALTER COLUMN "type" TYPE "MovementType_new" USING ("type"::text::"MovementType_new");
ALTER TYPE "MovementType" RENAME TO "MovementType_old";
ALTER TYPE "MovementType_new" RENAME TO "MovementType";
DROP TYPE "public"."MovementType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "foreman_stock" DROP CONSTRAINT "foreman_stock_foreman_id_fkey";

-- DropForeignKey
ALTER TABLE "foreman_stock" DROP CONSTRAINT "foreman_stock_material_id_fkey";

-- DropForeignKey
ALTER TABLE "foremen" DROP CONSTRAINT "foremen_project_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_foreman_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_project_id_fkey";

-- DropIndex
DROP INDEX "stock_movements_foreman_id_occurred_at_idx";

-- DropIndex
DROP INDEX "stock_movements_project_id_occurred_at_idx";

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stock_movements" DROP COLUMN "foreman_after",
DROP COLUMN "foreman_delta",
DROP COLUMN "foreman_id",
DROP COLUMN "project_id",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "block_after" DOUBLE PRECISION,
ADD COLUMN     "block_delta" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "block_id" TEXT,
ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "invoice_number" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "organization_id" TEXT,
ADD COLUMN     "payment_method" "PaymentMethod",
ADD COLUMN     "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "inn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '';

-- DropTable
DROP TABLE "foreman_stock";

-- DropTable
DROP TABLE "foremen";

-- DropTable
DROP TABLE "projects";

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "inn" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "external_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "organization_id" TEXT,
    "external_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_stock" (
    "block_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_stock_pkey" PRIMARY KEY ("block_id","material_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_external_id_key" ON "organizations"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_name_key" ON "blocks"("name");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_external_id_key" ON "blocks"("external_id");

-- CreateIndex
CREATE INDEX "blocks_organization_id_idx" ON "blocks"("organization_id");

-- CreateIndex
CREATE INDEX "block_stock_material_id_idx" ON "block_stock"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "materials_external_id_key" ON "materials"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_external_id_key" ON "stock_movements"("external_id");

-- CreateIndex
CREATE INDEX "stock_movements_block_id_occurred_at_idx" ON "stock_movements"("block_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "stock_movements_organization_id_occurred_at_idx" ON "stock_movements"("organization_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "stock_movements_supplier_id_occurred_at_idx" ON "stock_movements"("supplier_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_external_id_key" ON "suppliers"("external_id");

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_stock" ADD CONSTRAINT "block_stock_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_stock" ADD CONSTRAINT "block_stock_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ограничения целостности для новых таблиц и полей.
-- Это последний рубеж защиты: даже при ошибке в коде приложения база
-- не даст записать отрицательный остаток или операцию с нулевым количеством.
ALTER TABLE "block_stock"
  ADD CONSTRAINT "block_stock_quantity_non_negative" CHECK ("quantity" >= 0);

ALTER TABLE "materials"
  ADD CONSTRAINT "materials_price_non_negative" CHECK ("price" >= 0);

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_block_after_non_negative"
    CHECK ("block_after" IS NULL OR "block_after" >= 0),
  ADD CONSTRAINT "stock_movements_unit_price_non_negative" CHECK ("unit_price" >= 0),
  ADD CONSTRAINT "stock_movements_amount_non_negative" CHECK ("amount" >= 0),
  -- Расход и возврат всегда привязаны к блоку, приход — нет.
  ADD CONSTRAINT "stock_movements_block_required"
    CHECK ("type" = 'RECEIPT' OR "block_id" IS NOT NULL);

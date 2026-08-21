import { PageHeader } from "@/shared/components/page-header";
import { MaterialsTable } from "@/features/materials/materials-table";
import { MaterialFormDialog } from "@/features/materials/material-form-dialog";
import { listMaterials } from "@/server/queries";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const materials = listMaterials();

  return (
    <div>
      <PageHeader
        title="Материалы"
        description="Каталог материалов с текущими остатками на складе и на руках у бригад"
        actions={<MaterialFormDialog />}
      />
      <MaterialsTable materials={materials} initialLowStockOnly={params.filter === "low-stock"} />
    </div>
  );
}

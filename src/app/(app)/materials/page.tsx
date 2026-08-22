import { PageHeader } from "@/shared/components/page-header";
import { MaterialsTable } from "@/features/materials/materials-table";
import { MaterialFormDialog } from "@/features/materials/material-form-dialog";
import { listMaterials } from "@/server/queries";
import { getDictionary } from "@/i18n/server";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [t, materials] = await Promise.all([getDictionary(), listMaterials()]);

  return (
    <div>
      <PageHeader
        title={t.materials.title}
        description={t.materials.subtitle}
        actions={<MaterialFormDialog />}
      />
      <MaterialsTable materials={materials} initialLowStockOnly={params.filter === "low-stock"} />
    </div>
  );
}

import { PageHeader } from "@/shared/components/page-header";
import { MaterialsTable } from "@/features/materials/materials-table";
import { MaterialFormDialog } from "@/features/materials/material-form-dialog";
import { getCurrentUser, roleCan } from "@/lib/auth/dal";
import { listMaterials } from "@/server/queries";
import { getT } from "@/i18n/server";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [t, materials, user] = await Promise.all([getT(), listMaterials(), getCurrentUser()]);

  return (
    <div>
      <PageHeader
        title={t("materials.title")}
        description={t("materials.subtitle")}
        actions={<MaterialFormDialog />}
      />
      <MaterialsTable
        materials={materials}
        initialLowStockOnly={params.filter === "low-stock"}
        canEditPrice={Boolean(user && roleCan(user.role, "material:write"))}
      />
    </div>
  );
}

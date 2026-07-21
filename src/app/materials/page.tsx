import { Suspense } from "react";
import { PageHeader } from "@/shared/components/page-header";
import { MaterialsTable } from "@/features/materials/materials-table";

export default function MaterialsPage() {
  return (
    <div>
      <PageHeader
        title="Материалы"
        description="Каталог материалов на складе с текущими остатками"
      />
      <Suspense>
        <MaterialsTable />
      </Suspense>
    </div>
  );
}

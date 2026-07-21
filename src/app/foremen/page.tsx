import { PageHeader } from "@/shared/components/page-header";
import { ForemenTable } from "@/features/foremen/foremen-table";

export default function ForemenPage() {
  return (
    <div>
      <PageHeader title="Бригадиры" description="Бригадиры, получающие и возвращающие материалы" />
      <ForemenTable />
    </div>
  );
}

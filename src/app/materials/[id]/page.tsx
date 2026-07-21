import { MaterialDetailView } from "@/features/materials/material-detail-view";

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MaterialDetailView materialId={id} />;
}

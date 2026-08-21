import { PageHeader } from "@/shared/components/page-header";
import { ProjectsTable } from "@/features/projects/projects-table";
import { ProjectFormDialog } from "@/features/projects/project-form-dialog";
import { getCurrentUser, roleCan } from "@/lib/auth/dal";
import { getProjectSummaries, listProjects } from "@/server/queries";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  const summaries = getProjectSummaries();
  const projects = listProjects({ includeInactive: true }).map((project) => ({
    ...project,
    summary: summaries.get(project.id) ?? {
      projectId: project.id,
      foremenCount: 0,
      materialCount: 0,
      issueCount: 0,
      usageCount: 0,
      movementCount: 0,
      lastOperationAt: null,
    },
  }));

  return (
    <div>
      <PageHeader
        title="Объекты"
        description="Стройки, на которые уходят материалы со склада"
        actions={user && roleCan(user.role, "project:write") ? <ProjectFormDialog /> : undefined}
      />
      <ProjectsTable projects={projects} />
    </div>
  );
}

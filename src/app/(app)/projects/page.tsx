import { PageHeader } from "@/shared/components/page-header";
import { ProjectsTable } from "@/features/projects/projects-table";
import { ProjectFormDialog } from "@/features/projects/project-form-dialog";
import { getCurrentUser, roleCan } from "@/lib/auth/dal";
import { getProjectSummaries, listProjects } from "@/server/queries";
import { getDictionary } from "@/i18n/server";

export default async function ProjectsPage() {
  const [t, user, summaries, list] = await Promise.all([
    getDictionary(),
    getCurrentUser(),
    getProjectSummaries(),
    listProjects({ includeInactive: true }),
  ]);

  const projects = list.map((project) => ({
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
        title={t.projects.title}
        description={t.projects.subtitle}
        actions={user && roleCan(user.role, "project:write") ? <ProjectFormDialog /> : undefined}
      />
      <ProjectsTable projects={projects} />
    </div>
  );
}

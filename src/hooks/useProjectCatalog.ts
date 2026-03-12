import { useMemo } from "react";
import { mergeProjectWithContext, getProjectActivityIso } from "@/lib/project-context";
import { useProjectContextStore } from "@/stores/projectContextStore";
import { useProjectStore } from "@/stores/projectStore";

export function useProjectCatalog() {
  const projects = useProjectStore((state) => state.projects);
  const currentProject = useProjectStore((state) => state.currentProject);
  const contexts = useProjectContextStore((state) => state.contexts);

  return useMemo(() => {
    const mergedProjects = projects
      .map((project) => mergeProjectWithContext(project, contexts[project.id]))
      .sort(
        (a, b) =>
          new Date(getProjectActivityIso(b)).getTime() -
          new Date(getProjectActivityIso(a)).getTime()
      );

    const currentProjectWithContext = currentProject
      ? mergeProjectWithContext(currentProject, contexts[currentProject.id])
      : null;

    return {
      projects: mergedProjects,
      currentProject: currentProjectWithContext,
      getProjectById: (projectId: string) =>
        mergedProjects.find((project) => project.id === projectId) || null,
    };
  }, [projects, currentProject, contexts]);
}

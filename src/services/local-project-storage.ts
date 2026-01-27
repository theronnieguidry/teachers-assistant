import { invoke } from "@tauri-apps/api/core";
import { isTauriContext } from "./tauri-bridge";
import type {
  UnifiedProject,
  ProjectType,
  CreateUnifiedProjectData,
  ProjectSummary,
  gradeToGradeBand,
} from "@/types";

// ============================================
// Local Project Functions
// ============================================

/**
 * Get all local projects
 */
export async function getLocalProjects(): Promise<UnifiedProject[]> {
  if (!isTauriContext()) {
    // Browser fallback - use localStorage
    const stored = localStorage.getItem("local-projects");
    return stored ? JSON.parse(stored) : [];
  }

  const result = await invoke<string>("get_local_projects");
  return JSON.parse(result);
}

/**
 * Get a specific project by ID
 */
export async function getLocalProject(projectId: string): Promise<UnifiedProject | null> {
  if (!isTauriContext()) {
    // Browser fallback
    const projects = await getLocalProjects();
    return projects.find((p) => p.projectId === projectId) || null;
  }

  try {
    const result = await invoke<string>("get_local_project", { projectId });
    return JSON.parse(result);
  } catch {
    return null;
  }
}

/**
 * Save a local project (create or update)
 */
export async function saveLocalProject(project: UnifiedProject): Promise<void> {
  if (!isTauriContext()) {
    // Browser fallback
    const projects = await getLocalProjects();
    const index = projects.findIndex((p) => p.projectId === project.projectId);
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    localStorage.setItem("local-projects", JSON.stringify(projects));
    return;
  }

  await invoke("save_local_project", {
    project: JSON.stringify(project),
  });
}

/**
 * Create a new unified project
 */
export async function createLocalProject(data: CreateUnifiedProjectData): Promise<UnifiedProject> {
  const now = new Date().toISOString();

  // Import gradeToGradeBand dynamically to avoid circular deps
  const { gradeToGradeBand } = await import("@/types");

  const project: UnifiedProject = {
    projectId: crypto.randomUUID(),
    type: data.type,
    name: data.name,
    description: data.description,
    grade: data.grade,
    gradeBand: gradeToGradeBand(data.grade),
    subjectFocus: data.subjectFocus || [],
    learnerId: data.learnerId,
    linkedObjectiveIds: data.linkedObjectiveIds,
    defaultDesignPackId: data.defaultDesignPackId,
    artifactIds: [],
    status: "pending",
    lastActivityDate: now,
    createdAt: now,
    updatedAt: now,
  };

  await saveLocalProject(project);
  return project;
}

/**
 * Update a local project
 */
export async function updateLocalProject(
  projectId: string,
  updates: Partial<Omit<UnifiedProject, "projectId" | "createdAt">>
): Promise<UnifiedProject> {
  const project = await getLocalProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const updated: UnifiedProject = {
    ...project,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveLocalProject(updated);
  return updated;
}

/**
 * Delete a local project
 */
export async function deleteLocalProject(projectId: string): Promise<void> {
  if (!isTauriContext()) {
    // Browser fallback
    const projects = await getLocalProjects();
    const filtered = projects.filter((p) => p.projectId !== projectId);
    localStorage.setItem("local-projects", JSON.stringify(filtered));
    return;
  }

  await invoke("delete_local_project", { projectId });
}

/**
 * Get projects by type
 */
export async function getProjectsByType(type: ProjectType): Promise<UnifiedProject[]> {
  if (!isTauriContext()) {
    // Browser fallback
    const projects = await getLocalProjects();
    return projects.filter((p) => p.type === type);
  }

  const result = await invoke<string>("get_projects_by_type", { projectType: type });
  return JSON.parse(result);
}

/**
 * Get learning path projects
 */
export async function getLearningPathProjects(): Promise<UnifiedProject[]> {
  return getProjectsByType("learning_path");
}

/**
 * Get quick create projects
 */
export async function getQuickCreateProjects(): Promise<UnifiedProject[]> {
  return getProjectsByType("quick_create");
}

/**
 * Add artifact to project
 */
export async function addArtifactToProject(
  projectId: string,
  artifactId: string
): Promise<void> {
  if (!isTauriContext()) {
    // Browser fallback
    const project = await getLocalProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    if (!project.artifactIds.includes(artifactId)) {
      project.artifactIds.push(artifactId);
      project.lastActivityDate = new Date().toISOString();
      project.updatedAt = new Date().toISOString();
      await saveLocalProject(project);
    }
    return;
  }

  await invoke("add_artifact_to_project", { projectId, artifactId });
}

/**
 * Link objective to project
 */
export async function linkObjectiveToProject(
  projectId: string,
  objectiveId: string
): Promise<void> {
  const project = await getLocalProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  if (!project.linkedObjectiveIds) {
    project.linkedObjectiveIds = [];
  }

  if (!project.linkedObjectiveIds.includes(objectiveId)) {
    project.linkedObjectiveIds.push(objectiveId);
    project.updatedAt = new Date().toISOString();
    await saveLocalProject(project);
  }
}

/**
 * Unlink objective from project
 */
export async function unlinkObjectiveFromProject(
  projectId: string,
  objectiveId: string
): Promise<void> {
  const project = await getLocalProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  if (project.linkedObjectiveIds) {
    project.linkedObjectiveIds = project.linkedObjectiveIds.filter((id) => id !== objectiveId);
    project.updatedAt = new Date().toISOString();
    await saveLocalProject(project);
  }
}

/**
 * Get project summaries for display in lists
 */
export async function getProjectSummaries(): Promise<ProjectSummary[]> {
  const projects = await getLocalProjects();

  return projects.map((p) => ({
    projectId: p.projectId,
    type: p.type,
    name: p.name,
    grade: p.grade,
    subjectFocus: p.subjectFocus,
    lastActivityDate: p.lastActivityDate,
    artifactCount: p.artifactIds.length,
    learnerId: p.learnerId,
  }));
}

/**
 * Get the most recently used project
 */
export async function getMostRecentProject(): Promise<UnifiedProject | null> {
  const projects = await getLocalProjects();
  if (projects.length === 0) return null;

  // Sort by lastActivityDate descending
  const sorted = [...projects].sort(
    (a, b) => new Date(b.lastActivityDate).getTime() - new Date(a.lastActivityDate).getTime()
  );

  return sorted[0];
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  projectId: string,
  status: UnifiedProject["status"]
): Promise<void> {
  await updateLocalProject(projectId, { status });
}

/**
 * Set default design pack for project
 */
export async function setProjectDesignPack(
  projectId: string,
  designPackId: string | undefined
): Promise<void> {
  await updateLocalProject(projectId, { defaultDesignPackId: designPackId });
}

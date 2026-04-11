import type {
  Project,
  ProjectContext,
  ProjectType,
  ProjectWithContext,
  StoredProjectOptions,
} from "@/types";

export function createDefaultProjectContext(
  projectId: string,
  seed?: Partial<Omit<ProjectContext, "projectId">>
): ProjectContext {
  return {
    projectId,
    type: seed?.type || "quick_create",
    learnerId: seed?.learnerId,
    linkedObjectiveIds: seed?.linkedObjectiveIds || [],
    defaultDesignPackId: seed?.defaultDesignPackId,
    selectedInspirationIds: seed?.selectedInspirationIds || [],
    lastUsedAt: seed?.lastUsedAt || new Date().toISOString(),
  };
}

export function mergeProjectWithContext(
  project: Project,
  context?: ProjectContext | null
): ProjectWithContext {
  const fallbackLastUsedAt =
    project.completedAt?.toISOString() ||
    project.updatedAt.toISOString() ||
    project.createdAt.toISOString();
  const resolvedContext = createDefaultProjectContext(project.id, {
    type: context?.type || "quick_create",
    learnerId: context?.learnerId,
    linkedObjectiveIds: context?.linkedObjectiveIds || [],
    defaultDesignPackId: context?.defaultDesignPackId,
    selectedInspirationIds: context?.selectedInspirationIds || [],
    lastUsedAt: context?.lastUsedAt || fallbackLastUsedAt,
  });

  return {
    ...project,
    ...resolvedContext,
  };
}

export function getStoredObjectiveId(
  options?: StoredProjectOptions | Record<string, unknown> | null
): string | null {
  if (!options || typeof options !== "object") {
    return null;
  }

  const maybeObjectiveId = (options as { objectiveId?: unknown }).objectiveId;
  return typeof maybeObjectiveId === "string" ? maybeObjectiveId : null;
}

export function mergeContextValues(
  existing: ProjectContext | null,
  updates: Partial<Omit<ProjectContext, "projectId">>,
  projectId: string
): ProjectContext {
  const base = existing || createDefaultProjectContext(projectId);
  return {
    ...base,
    ...updates,
    linkedObjectiveIds: updates.linkedObjectiveIds || base.linkedObjectiveIds,
    selectedInspirationIds: updates.selectedInspirationIds || base.selectedInspirationIds,
  };
}

export function compactContextUpdates<T extends Partial<Omit<ProjectContext, "projectId">>>(
  updates: T
): T {
  return Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  ) as T;
}

export function getProjectActivityIso(project: ProjectWithContext | Project): string {
  if ("lastUsedAt" in project && typeof project.lastUsedAt === "string") {
    return project.lastUsedAt;
  }

  return (
    project.completedAt?.toISOString() ||
    project.updatedAt.toISOString() ||
    project.createdAt.toISOString()
  );
}

export function getPreferredProjectType(hasLearnerContext: boolean): ProjectType {
  return hasLearnerContext ? "learning_path" : "quick_create";
}

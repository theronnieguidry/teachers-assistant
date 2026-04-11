import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project, ProjectContext, ProjectContextMigrationState, ProjectType } from "@/types";
import { getArtifact } from "@/services/library-storage";
import { getLocalProjects } from "@/services/local-project-storage";
import {
  createDefaultProjectContext,
  compactContextUpdates,
  mergeContextValues,
} from "@/lib/project-context";

const PROJECT_CONTEXT_STORAGE_KEY = "ta-project-contexts";
const PROJECT_CONTEXT_MIGRATION_VERSION = 2;

interface LastUsedProjectOptions {
  learnerId?: string | null;
  preferredType?: ProjectType;
  allowedProjectIds?: Iterable<string>;
}

interface LegacyMigrationResult {
  migratedProjectIds: string[];
  unmappedLegacyProjectIds: string[];
}

interface ProjectContextState {
  contexts: Record<string, ProjectContext>;
  migration: ProjectContextMigrationState;
  getContext: (projectId: string) => ProjectContext | null;
  getLastUsedProjectId: (options?: LastUsedProjectOptions) => string | null;
  upsertContext: (
    projectId: string,
    updates: Partial<Omit<ProjectContext, "projectId">>
  ) => ProjectContext;
  markProjectUsed: (
    projectId: string,
    seed?: Partial<Omit<ProjectContext, "projectId" | "lastUsedAt">>
  ) => ProjectContext;
  linkObjective: (projectId: string, objectiveId: string) => ProjectContext;
  setDefaultDesignPack: (
    projectId: string,
    designPackId: string | undefined
  ) => ProjectContext;
  setSelectedInspirationIds: (
    projectId: string,
    inspirationIds: string[]
  ) => ProjectContext;
  removeContext: (projectId: string) => void;
  migrateLegacyUnifiedProjects: (projects: Project[]) => Promise<LegacyMigrationResult>;
  reset: () => void;
}

function normalizeAllowedProjectIds(
  ids?: Iterable<string>
): Set<string> | null {
  if (!ids) return null;
  return new Set(ids);
}

function toSortedContexts(
  contexts: Record<string, ProjectContext>,
  options?: LastUsedProjectOptions
): ProjectContext[] {
  const allowed = normalizeAllowedProjectIds(options?.allowedProjectIds);

  return Object.values(contexts)
    .filter((context) => {
      if (allowed && !allowed.has(context.projectId)) return false;
      if (options?.learnerId && context.learnerId !== options.learnerId) return false;
      if (options?.preferredType && context.type !== options.preferredType) return false;
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
    );
}

export const useProjectContextStore = create<ProjectContextState>()(
  persist(
    (set, get) => ({
      contexts: {},
      migration: {
        version: 0,
        unmappedLegacyProjectIds: [],
      },

      getContext: (projectId) => {
        return get().contexts[projectId] || null;
      },

      getLastUsedProjectId: (options) => {
        const matching = toSortedContexts(get().contexts, options);
        if (matching.length > 0) {
          return matching[0].projectId;
        }

        if (options?.learnerId || options?.preferredType) {
          const fallback = toSortedContexts(get().contexts, {
            allowedProjectIds: options?.allowedProjectIds,
          });
          return fallback[0]?.projectId || null;
        }

        return null;
      },

      upsertContext: (projectId, updates) => {
        const current = get().contexts[projectId] || null;
        const next = mergeContextValues(current, updates, projectId);
        set((state) => ({
          contexts: {
            ...state.contexts,
            [projectId]: next,
          },
        }));
        return next;
      },

      markProjectUsed: (projectId, seed) => {
        const now = new Date().toISOString();
        return get().upsertContext(projectId, {
          ...compactContextUpdates(seed || {}),
          lastUsedAt: now,
        });
      },

      linkObjective: (projectId, objectiveId) => {
        const current = get().getContext(projectId);
        const linkedObjectiveIds = Array.from(
          new Set([...(current?.linkedObjectiveIds || []), objectiveId])
        );
        return get().upsertContext(projectId, { linkedObjectiveIds });
      },

      setDefaultDesignPack: (projectId, designPackId) => {
        return get().upsertContext(projectId, { defaultDesignPackId: designPackId });
      },

      setSelectedInspirationIds: (projectId, inspirationIds) => {
        return get().upsertContext(projectId, {
          selectedInspirationIds: Array.from(new Set(inspirationIds)),
        });
      },

      removeContext: (projectId) => {
        set((state) => {
          if (!state.contexts[projectId]) return state;
          const nextContexts = { ...state.contexts };
          delete nextContexts[projectId];
          return { contexts: nextContexts };
        });
      },

      migrateLegacyUnifiedProjects: async (projects) => {
        const state = get();
        if (state.migration.version >= PROJECT_CONTEXT_MIGRATION_VERSION) {
          return {
            migratedProjectIds: [],
            unmappedLegacyProjectIds: state.migration.unmappedLegacyProjectIds,
          };
        }

        const remoteProjectIds = new Set(projects.map((project) => project.id));
        const legacyProjects = await getLocalProjects();
        const nextContexts = { ...state.contexts };
        const migratedProjectIds = new Set<string>();
        const unmappedLegacyProjectIds: string[] = [];

        for (const legacyProject of legacyProjects) {
          if (!legacyProject.artifactIds || legacyProject.artifactIds.length === 0) {
            unmappedLegacyProjectIds.push(legacyProject.projectId);
            continue;
          }

          const linkedProjectIds = new Set<string>();
          for (const artifactId of legacyProject.artifactIds) {
            const artifact = await getArtifact(artifactId);
            if (artifact?.projectId) {
              linkedProjectIds.add(artifact.projectId);
            }
          }

          if (linkedProjectIds.size !== 1) {
            unmappedLegacyProjectIds.push(legacyProject.projectId);
            continue;
          }

          const [canonicalProjectId] = Array.from(linkedProjectIds);
          if (!remoteProjectIds.has(canonicalProjectId)) {
            unmappedLegacyProjectIds.push(legacyProject.projectId);
            continue;
          }

          const existingContext = nextContexts[canonicalProjectId] || null;
          const mergedLinkedObjectives = Array.from(
            new Set([
              ...(existingContext?.linkedObjectiveIds || []),
              ...(legacyProject.linkedObjectiveIds || []),
            ])
          );

          nextContexts[canonicalProjectId] = mergeContextValues(
            existingContext,
            {
              type: existingContext?.type || legacyProject.type,
              learnerId: existingContext?.learnerId || legacyProject.learnerId,
              linkedObjectiveIds: mergedLinkedObjectives,
              defaultDesignPackId:
                existingContext?.defaultDesignPackId || legacyProject.defaultDesignPackId,
              selectedInspirationIds:
                existingContext?.selectedInspirationIds || [],
              lastUsedAt:
                existingContext &&
                new Date(existingContext.lastUsedAt).getTime() >
                  new Date(legacyProject.lastActivityDate).getTime()
                  ? existingContext.lastUsedAt
                  : legacyProject.lastActivityDate,
            },
            canonicalProjectId
          );
          migratedProjectIds.add(canonicalProjectId);
        }

        set({
          contexts: nextContexts,
          migration: {
            version: PROJECT_CONTEXT_MIGRATION_VERSION,
            migratedAt: new Date().toISOString(),
            unmappedLegacyProjectIds,
          },
        });

        if (unmappedLegacyProjectIds.length > 0) {
          console.warn(
            "[project-context] Legacy unified projects could not be mapped to canonical projects:",
            unmappedLegacyProjectIds
          );
        }

        return {
          migratedProjectIds: Array.from(migratedProjectIds),
          unmappedLegacyProjectIds,
        };
      },

      reset: () =>
        set({
          contexts: {},
          migration: {
            version: 0,
            unmappedLegacyProjectIds: [],
          },
        }),
    }),
    {
      name: PROJECT_CONTEXT_STORAGE_KEY,
      partialize: (state) => ({
        contexts: state.contexts,
        migration: state.migration,
      }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<ProjectContextState> | undefined;
        const normalizedContexts = Object.fromEntries(
          Object.entries(stored?.contexts || current.contexts).map(([projectId, context]) => [
            projectId,
            createDefaultProjectContext(projectId, context),
          ])
        );
        return {
          ...current,
          contexts: normalizedContexts,
          migration: stored?.migration || current.migration,
        };
      },
    }
  )
);

export function getProjectContextOrDefault(
  projectId: string,
  projectType: ProjectType = "quick_create"
): ProjectContext {
  return (
    useProjectContextStore.getState().getContext(projectId) ||
    createDefaultProjectContext(projectId, { type: projectType })
  );
}

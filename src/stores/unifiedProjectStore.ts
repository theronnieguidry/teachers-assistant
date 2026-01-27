import { create } from "zustand";
import type {
  UnifiedProject,
  ProjectType,
  CreateUnifiedProjectData,
  ProjectSummary,
  Grade,
} from "@/types";
import {
  getLocalProjects,
  getLocalProject,
  createLocalProject,
  updateLocalProject,
  deleteLocalProject,
  getProjectsByType,
  addArtifactToProject,
  linkObjectiveToProject,
  unlinkObjectiveFromProject,
  getProjectSummaries,
  getMostRecentProject,
  setProjectDesignPack,
} from "@/services/local-project-storage";

// Key for storing current project ID in localStorage
const CURRENT_PROJECT_KEY = "current-project-id";

interface UnifiedProjectState {
  // Project list state
  projects: UnifiedProject[];
  isLoading: boolean;
  error: string | null;

  // Current project state
  currentProjectId: string | null;
  currentProject: UnifiedProject | null;

  // Project summaries for display
  summaries: ProjectSummary[];

  // Computed helpers
  getProjectById: (projectId: string) => UnifiedProject | null;
  getLearningPathProjects: () => UnifiedProject[];
  getQuickCreateProjects: () => UnifiedProject[];
  getProjectsByLearner: (learnerId: string) => UnifiedProject[];
  getCurrentProject: () => UnifiedProject | null;

  // Project CRUD actions
  loadProjects: () => Promise<void>;
  loadProject: (projectId: string) => Promise<UnifiedProject | null>;
  createProject: (data: CreateUnifiedProjectData) => Promise<UnifiedProject>;
  updateProject: (
    projectId: string,
    updates: Partial<Omit<UnifiedProject, "projectId" | "createdAt">>
  ) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;

  // Project type filters
  loadProjectsByType: (type: ProjectType) => Promise<void>;

  // Current project management
  setCurrentProject: (projectId: string | null) => void;
  loadCurrentProject: () => Promise<void>;

  // Artifact management
  addArtifact: (projectId: string, artifactId: string) => Promise<void>;

  // Objective management
  linkObjective: (projectId: string, objectiveId: string) => Promise<void>;
  unlinkObjective: (projectId: string, objectiveId: string) => Promise<void>;

  // Design pack management
  setDesignPack: (projectId: string, designPackId: string | undefined) => Promise<void>;

  // Quick actions
  createLearningPathProject: (
    learnerId: string,
    objectiveId: string,
    grade: Grade,
    subject: string
  ) => Promise<UnifiedProject>;
  createQuickProject: (
    name: string,
    grade: Grade,
    subjects: string[]
  ) => Promise<UnifiedProject>;

  // Utility actions
  clearError: () => void;
  reset: () => void;
}

export const useUnifiedProjectStore = create<UnifiedProjectState>()((set, get) => ({
  // Initial state
  projects: [],
  isLoading: false,
  error: null,
  currentProjectId: localStorage.getItem(CURRENT_PROJECT_KEY),
  currentProject: null,
  summaries: [],

  // ============================================
  // Computed Helpers
  // ============================================

  getProjectById: (projectId: string) => {
    const { projects } = get();
    return projects.find((p) => p.projectId === projectId) || null;
  },

  getLearningPathProjects: () => {
    const { projects } = get();
    return projects.filter((p) => p.type === "learning_path");
  },

  getQuickCreateProjects: () => {
    const { projects } = get();
    return projects.filter((p) => p.type === "quick_create");
  },

  getProjectsByLearner: (learnerId: string) => {
    const { projects } = get();
    return projects.filter((p) => p.learnerId === learnerId);
  },

  getCurrentProject: () => {
    const { projects, currentProjectId } = get();
    if (!currentProjectId) return null;
    return projects.find((p) => p.projectId === currentProjectId) || null;
  },

  // ============================================
  // Project CRUD Actions
  // ============================================

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await getLocalProjects();
      const summaries = await getProjectSummaries();
      set({ projects, summaries, isLoading: false });

      // Load current project if set
      const { currentProjectId } = get();
      if (currentProjectId) {
        const exists = projects.some((p) => p.projectId === currentProjectId);
        if (exists) {
          const currentProject = projects.find((p) => p.projectId === currentProjectId) || null;
          set({ currentProject });
        } else {
          // Current project no longer exists, clear it
          set({ currentProjectId: null, currentProject: null });
          localStorage.removeItem(CURRENT_PROJECT_KEY);
        }
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load projects",
      });
    }
  },

  loadProject: async (projectId: string) => {
    try {
      const project = await getLocalProject(projectId);
      return project;
    } catch (error) {
      console.error("Failed to load project:", error);
      return null;
    }
  },

  createProject: async (data: CreateUnifiedProjectData) => {
    set({ isLoading: true, error: null });
    try {
      const project = await createLocalProject(data);
      set((state) => ({
        projects: [...state.projects, project],
        isLoading: false,
      }));

      // Reload summaries
      const summaries = await getProjectSummaries();
      set({ summaries });

      return project;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to create project",
      });
      throw error;
    }
  },

  updateProject: async (projectId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateLocalProject(projectId, updates);
      set((state) => ({
        projects: state.projects.map((p) => (p.projectId === projectId ? updated : p)),
        currentProject: state.currentProjectId === projectId ? updated : state.currentProject,
        isLoading: false,
      }));

      // Reload summaries
      const summaries = await getProjectSummaries();
      set({ summaries });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to update project",
      });
      throw error;
    }
  },

  deleteProject: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteLocalProject(projectId);
      set((state) => ({
        projects: state.projects.filter((p) => p.projectId !== projectId),
        currentProjectId:
          state.currentProjectId === projectId ? null : state.currentProjectId,
        currentProject:
          state.currentProjectId === projectId ? null : state.currentProject,
        isLoading: false,
      }));

      // Update localStorage
      const { currentProjectId } = get();
      if (!currentProjectId) {
        localStorage.removeItem(CURRENT_PROJECT_KEY);
      }

      // Reload summaries
      const summaries = await getProjectSummaries();
      set({ summaries });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to delete project",
      });
      throw error;
    }
  },

  // ============================================
  // Project Type Filters
  // ============================================

  loadProjectsByType: async (type: ProjectType) => {
    set({ isLoading: true, error: null });
    try {
      const projects = await getProjectsByType(type);
      set({ projects, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load projects",
      });
    }
  },

  // ============================================
  // Current Project Management
  // ============================================

  setCurrentProject: (projectId: string | null) => {
    if (projectId) {
      localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
      const project = get().getProjectById(projectId);
      set({ currentProjectId: projectId, currentProject: project });
    } else {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
      set({ currentProjectId: null, currentProject: null });
    }
  },

  loadCurrentProject: async () => {
    const { currentProjectId } = get();
    if (!currentProjectId) return;

    const project = await getLocalProject(currentProjectId);
    if (project) {
      set({ currentProject: project });
    } else {
      // Project no longer exists, clear it
      set({ currentProjectId: null, currentProject: null });
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
  },

  // ============================================
  // Artifact Management
  // ============================================

  addArtifact: async (projectId: string, artifactId: string) => {
    try {
      await addArtifactToProject(projectId, artifactId);

      // Update local state
      set((state) => ({
        projects: state.projects.map((p) => {
          if (p.projectId === projectId) {
            return {
              ...p,
              artifactIds: p.artifactIds.includes(artifactId)
                ? p.artifactIds
                : [...p.artifactIds, artifactId],
              lastActivityDate: new Date().toISOString(),
            };
          }
          return p;
        }),
        currentProject:
          state.currentProjectId === projectId && state.currentProject
            ? {
                ...state.currentProject,
                artifactIds: state.currentProject.artifactIds.includes(artifactId)
                  ? state.currentProject.artifactIds
                  : [...state.currentProject.artifactIds, artifactId],
                lastActivityDate: new Date().toISOString(),
              }
            : state.currentProject,
      }));
    } catch (error) {
      console.error("Failed to add artifact to project:", error);
      throw error;
    }
  },

  // ============================================
  // Objective Management
  // ============================================

  linkObjective: async (projectId: string, objectiveId: string) => {
    try {
      await linkObjectiveToProject(projectId, objectiveId);

      // Update local state
      set((state) => ({
        projects: state.projects.map((p) => {
          if (p.projectId === projectId) {
            const linkedObjectiveIds = p.linkedObjectiveIds || [];
            return {
              ...p,
              linkedObjectiveIds: linkedObjectiveIds.includes(objectiveId)
                ? linkedObjectiveIds
                : [...linkedObjectiveIds, objectiveId],
            };
          }
          return p;
        }),
      }));
    } catch (error) {
      console.error("Failed to link objective to project:", error);
      throw error;
    }
  },

  unlinkObjective: async (projectId: string, objectiveId: string) => {
    try {
      await unlinkObjectiveFromProject(projectId, objectiveId);

      // Update local state
      set((state) => ({
        projects: state.projects.map((p) => {
          if (p.projectId === projectId && p.linkedObjectiveIds) {
            return {
              ...p,
              linkedObjectiveIds: p.linkedObjectiveIds.filter((id) => id !== objectiveId),
            };
          }
          return p;
        }),
      }));
    } catch (error) {
      console.error("Failed to unlink objective from project:", error);
      throw error;
    }
  },

  // ============================================
  // Design Pack Management
  // ============================================

  setDesignPack: async (projectId: string, designPackId: string | undefined) => {
    try {
      await setProjectDesignPack(projectId, designPackId);

      // Update local state
      set((state) => ({
        projects: state.projects.map((p) => {
          if (p.projectId === projectId) {
            return { ...p, defaultDesignPackId: designPackId };
          }
          return p;
        }),
        currentProject:
          state.currentProjectId === projectId && state.currentProject
            ? { ...state.currentProject, defaultDesignPackId: designPackId }
            : state.currentProject,
      }));
    } catch (error) {
      console.error("Failed to set design pack for project:", error);
      throw error;
    }
  },

  // ============================================
  // Quick Actions
  // ============================================

  createLearningPathProject: async (learnerId, objectiveId, grade, subject) => {
    return get().createProject({
      type: "learning_path",
      name: `${subject} Learning Path`,
      grade,
      subjectFocus: [subject],
      learnerId,
      linkedObjectiveIds: [objectiveId],
    });
  },

  createQuickProject: async (name, grade, subjects) => {
    return get().createProject({
      type: "quick_create",
      name,
      grade,
      subjectFocus: subjects,
    });
  },

  // ============================================
  // Utility Actions
  // ============================================

  clearError: () => set({ error: null }),

  reset: () => {
    localStorage.removeItem(CURRENT_PROJECT_KEY);
    set({
      projects: [],
      isLoading: false,
      error: null,
      currentProjectId: null,
      currentProject: null,
      summaries: [],
    });
  },
}));

// Export convenience selector hooks
export const useCurrentProject = () =>
  useUnifiedProjectStore((state) => state.getCurrentProject());

export const useLearningPathProjects = () =>
  useUnifiedProjectStore((state) => state.getLearningPathProjects());

export const useQuickCreateProjects = () =>
  useUnifiedProjectStore((state) => state.getQuickCreateProjects());

export const useProjectSummaries = () =>
  useUnifiedProjectStore((state) => state.summaries);

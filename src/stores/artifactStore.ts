import { create } from "zustand";
import type {
  LocalArtifact,
  ArtifactSearchQuery,
  ArtifactType,
  Grade,
  LibraryFilters,
  LibraryViewMode,
  LibrarySortBy,
} from "@/types";
import {
  getArtifacts,
  getArtifact,
  saveArtifact,
  deleteArtifact,
  searchArtifacts,
  saveArtifactsFromGeneration,
  getArtifactsByJob,
  updateArtifactTags,
} from "@/services/library-storage";

interface ArtifactState {
  // Artifact list state
  artifacts: Omit<LocalArtifact, "htmlContent">[];
  isLoading: boolean;
  error: string | null;

  // Current artifact state (with full content)
  currentArtifact: LocalArtifact | null;
  isLoadingCurrent: boolean;

  // Library UI state
  viewMode: LibraryViewMode;
  sortBy: LibrarySortBy;
  filters: LibraryFilters;
  searchQuery: string;

  // Computed helpers
  getArtifactsByProject: (projectId: string) => Omit<LocalArtifact, "htmlContent">[];
  getArtifactsByType: (type: ArtifactType) => Omit<LocalArtifact, "htmlContent">[];
  getFilteredArtifacts: () => Omit<LocalArtifact, "htmlContent">[];

  // Actions
  loadArtifacts: () => Promise<void>;
  loadArtifact: (artifactId: string) => Promise<LocalArtifact | null>;
  saveArtifact: (artifact: LocalArtifact) => Promise<void>;
  deleteArtifact: (artifactId: string) => Promise<void>;
  searchArtifacts: (query: ArtifactSearchQuery) => Promise<void>;

  // Load all artifacts from the same generation job
  loadArtifactsByJob: (jobId: string) => Promise<LocalArtifact[]>;

  // Update objective tags on an artifact
  updateTags: (artifactId: string, tags: string[]) => Promise<void>;

  // Batch save from generation
  saveFromGeneration: (params: {
    projectId: string;
    jobId: string;
    grade: string;
    subject: string;
    title: string;
    objectiveTags: string[];
    designPackId?: string;
    contents: {
      studentPage?: string;
      teacherScript?: string;
      answerKey?: string;
      lessonPlan?: string;
    };
  }) => Promise<LocalArtifact[]>;

  // UI state actions
  setViewMode: (mode: LibraryViewMode) => void;
  setSortBy: (sort: LibrarySortBy) => void;
  setFilters: (filters: Partial<LibraryFilters>) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setCurrentArtifact: (artifact: LocalArtifact | null) => void;

  // Utility actions
  clearError: () => void;
  reset: () => void;
}

const DEFAULT_FILTERS: LibraryFilters = {
  projects: [],
  grades: [],
  subjects: [],
  types: [],
  objectiveTags: [],
};

export const useArtifactStore = create<ArtifactState>()((set, get) => ({
  // Initial state
  artifacts: [],
  isLoading: false,
  error: null,
  currentArtifact: null,
  isLoadingCurrent: false,
  viewMode: "grid",
  sortBy: "date_desc",
  filters: DEFAULT_FILTERS,
  searchQuery: "",

  // ============================================
  // Computed Helpers
  // ============================================

  getArtifactsByProject: (projectId: string) => {
    const { artifacts } = get();
    return artifacts.filter((a) => a.projectId === projectId);
  },

  getArtifactsByType: (type: ArtifactType) => {
    const { artifacts } = get();
    return artifacts.filter((a) => a.type === type);
  },

  getFilteredArtifacts: () => {
    const { artifacts, filters, searchQuery, sortBy } = get();
    let filtered = [...artifacts];

    // Apply filters
    if (filters.projects.length > 0) {
      filtered = filtered.filter((a) => filters.projects.includes(a.projectId));
    }
    if (filters.grades.length > 0) {
      filtered = filtered.filter((a) => filters.grades.includes(a.grade));
    }
    if (filters.subjects.length > 0) {
      filtered = filtered.filter((a) => filters.subjects.includes(a.subject));
    }
    if (filters.types.length > 0) {
      filtered = filtered.filter((a) => filters.types.includes(a.type));
    }
    if (filters.objectiveTags.length > 0) {
      filtered = filtered.filter((a) =>
        a.objectiveTags.some((t) => filters.objectiveTags.includes(t))
      );
    }
    if (filters.dateRange) {
      const fromDate = new Date(filters.dateRange.from);
      const toDate = new Date(filters.dateRange.to);
      filtered = filtered.filter((a) => {
        const createdAt = new Date(a.createdAt);
        return createdAt >= fromDate && createdAt <= toDate;
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a) =>
        a.title.toLowerCase().includes(query)
      );
    }

    // Apply sort
    switch (sortBy) {
      case "date_desc":
        filtered.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "date_asc":
        filtered.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "title_asc":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title_desc":
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "grade":
        const gradeOrder: Record<Grade, number> = {
          K: 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
        };
        filtered.sort((a, b) => gradeOrder[a.grade] - gradeOrder[b.grade]);
        break;
    }

    return filtered;
  },

  // ============================================
  // Data Actions
  // ============================================

  loadArtifacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const artifacts = await getArtifacts();
      set({ artifacts, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load artifacts",
      });
    }
  },

  loadArtifact: async (artifactId: string) => {
    set({ isLoadingCurrent: true });
    try {
      const artifact = await getArtifact(artifactId);
      set({ currentArtifact: artifact, isLoadingCurrent: false });
      return artifact;
    } catch (error) {
      set({ isLoadingCurrent: false });
      console.error("Failed to load artifact:", error);
      return null;
    }
  },

  saveArtifact: async (artifact: LocalArtifact) => {
    set({ isLoading: true, error: null });
    try {
      await saveArtifact(artifact);
      // Reload artifacts to get updated index
      await get().loadArtifacts();
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to save artifact",
      });
      throw error;
    }
  },

  deleteArtifact: async (artifactId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteArtifact(artifactId);
      set((state) => ({
        artifacts: state.artifacts.filter((a) => a.artifactId !== artifactId),
        currentArtifact:
          state.currentArtifact?.artifactId === artifactId
            ? null
            : state.currentArtifact,
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to delete artifact",
      });
      throw error;
    }
  },

  searchArtifacts: async (query: ArtifactSearchQuery) => {
    set({ isLoading: true, error: null });
    try {
      const artifacts = await searchArtifacts(query);
      set({ artifacts, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to search artifacts",
      });
    }
  },

  loadArtifactsByJob: async (jobId: string) => {
    try {
      return await getArtifactsByJob(jobId);
    } catch (error) {
      console.error("Failed to load artifacts by job:", error);
      return [];
    }
  },

  updateTags: async (artifactId: string, tags: string[]) => {
    try {
      await updateArtifactTags(artifactId, tags);

      // Update local state
      set((state) => ({
        artifacts: state.artifacts.map((a) =>
          a.artifactId === artifactId ? { ...a, objectiveTags: tags } : a
        ),
        currentArtifact:
          state.currentArtifact?.artifactId === artifactId
            ? { ...state.currentArtifact, objectiveTags: tags }
            : state.currentArtifact,
      }));
    } catch (error) {
      console.error("Failed to update artifact tags:", error);
      throw error;
    }
  },

  saveFromGeneration: async (params) => {
    try {
      const artifacts = await saveArtifactsFromGeneration(
        params.projectId,
        params.jobId,
        params.grade,
        params.subject,
        params.title,
        params.objectiveTags,
        params.designPackId,
        params.contents
      );

      // Reload artifacts to get updated index
      await get().loadArtifacts();

      return artifacts;
    } catch (error) {
      console.error("Failed to save artifacts from generation:", error);
      throw error;
    }
  },

  // ============================================
  // UI State Actions
  // ============================================

  setViewMode: (mode: LibraryViewMode) => set({ viewMode: mode }),

  setSortBy: (sort: LibrarySortBy) => set({ sortBy: sort }),

  setFilters: (filters: Partial<LibraryFilters>) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  clearFilters: () => set({ filters: DEFAULT_FILTERS, searchQuery: "" }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setCurrentArtifact: (artifact: LocalArtifact | null) =>
    set({ currentArtifact: artifact }),

  // ============================================
  // Utility Actions
  // ============================================

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      artifacts: [],
      isLoading: false,
      error: null,
      currentArtifact: null,
      isLoadingCurrent: false,
      viewMode: "grid",
      sortBy: "date_desc",
      filters: DEFAULT_FILTERS,
      searchQuery: "",
    }),
}));

// Export convenience selector hooks
export const useFilteredArtifacts = () =>
  useArtifactStore((state) => state.getFilteredArtifacts());

export const useArtifactsByProject = (projectId: string) =>
  useArtifactStore((state) => state.getArtifactsByProject(projectId));

export const useCurrentArtifact = () =>
  useArtifactStore((state) => state.currentArtifact);

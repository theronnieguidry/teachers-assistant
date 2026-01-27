import { describe, it, expect, beforeEach, vi } from "vitest";
import { useArtifactStore } from "@/stores/artifactStore";
import type { LocalArtifact } from "@/types";

// Mock the library-storage service
vi.mock("@/services/library-storage", () => ({
  getArtifacts: vi.fn().mockResolvedValue([]),
  getArtifact: vi.fn().mockResolvedValue(null),
  saveArtifact: vi.fn().mockResolvedValue(undefined),
  deleteArtifact: vi.fn().mockResolvedValue(undefined),
  searchArtifacts: vi.fn().mockResolvedValue([]),
  saveArtifactsFromGeneration: vi.fn().mockResolvedValue([]),
}));

const mockArtifact: Omit<LocalArtifact, "htmlContent"> = {
  artifactId: "artifact-1",
  projectId: "project-1",
  jobId: "job-1",
  type: "student_page",
  title: "Math Worksheet - Addition",
  grade: "2",
  subject: "Math",
  objectiveTags: ["2.MATH.ADD.BASIC"],
  createdAt: new Date().toISOString(),
};

const mockArtifact2: Omit<LocalArtifact, "htmlContent"> = {
  artifactId: "artifact-2",
  projectId: "project-1",
  jobId: "job-1",
  type: "answer_key",
  title: "Math Worksheet - Answer Key",
  grade: "2",
  subject: "Math",
  objectiveTags: ["2.MATH.ADD.BASIC"],
  createdAt: new Date().toISOString(),
};

const mockArtifact3: Omit<LocalArtifact, "htmlContent"> = {
  artifactId: "artifact-3",
  projectId: "project-2",
  jobId: "job-2",
  type: "lesson_plan",
  title: "Reading Lesson Plan",
  grade: "K",
  subject: "Reading",
  objectiveTags: ["K.READING.PHONICS"],
  createdAt: new Date().toISOString(),
};

describe("artifactStore", () => {
  beforeEach(() => {
    // Reset store state
    useArtifactStore.setState({
      artifacts: [],
      isLoading: false,
      error: null,
      currentArtifact: null,
      isLoadingCurrent: false,
      viewMode: "grid",
      sortBy: "date_desc",
      filters: {
        projects: [],
        grades: [],
        subjects: [],
        types: [],
        objectiveTags: [],
      },
      searchQuery: "",
    });
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with empty artifacts", () => {
      const { artifacts } = useArtifactStore.getState();
      expect(artifacts).toEqual([]);
    });

    it("starts with grid view mode", () => {
      const { viewMode } = useArtifactStore.getState();
      expect(viewMode).toBe("grid");
    });

    it("starts with date_desc sort", () => {
      const { sortBy } = useArtifactStore.getState();
      expect(sortBy).toBe("date_desc");
    });

    it("starts with empty filters", () => {
      const { filters } = useArtifactStore.getState();
      expect(filters.projects).toEqual([]);
      expect(filters.grades).toEqual([]);
      expect(filters.subjects).toEqual([]);
      expect(filters.types).toEqual([]);
    });
  });

  describe("computed helpers", () => {
    it("getArtifactsByProject returns artifacts for specific project", () => {
      useArtifactStore.setState({
        artifacts: [mockArtifact, mockArtifact2, mockArtifact3],
      });

      const projectArtifacts = useArtifactStore.getState().getArtifactsByProject("project-1");
      expect(projectArtifacts).toHaveLength(2);
      expect(projectArtifacts.every((a) => a.projectId === "project-1")).toBe(true);
    });

    it("getArtifactsByType returns artifacts of specific type", () => {
      useArtifactStore.setState({
        artifacts: [mockArtifact, mockArtifact2, mockArtifact3],
      });

      const studentPages = useArtifactStore.getState().getArtifactsByType("student_page");
      expect(studentPages).toHaveLength(1);
      expect(studentPages[0].type).toBe("student_page");
    });

    it("getFilteredArtifacts respects grade filter", () => {
      useArtifactStore.setState({
        artifacts: [mockArtifact, mockArtifact2, mockArtifact3],
        filters: {
          projects: [],
          grades: ["K"],
          subjects: [],
          types: [],
          objectiveTags: [],
        },
      });

      const filtered = useArtifactStore.getState().getFilteredArtifacts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].grade).toBe("K");
    });

    it("getFilteredArtifacts respects subject filter", () => {
      useArtifactStore.setState({
        artifacts: [mockArtifact, mockArtifact2, mockArtifact3],
        filters: {
          projects: [],
          grades: [],
          subjects: ["Math"],
          types: [],
          objectiveTags: [],
        },
      });

      const filtered = useArtifactStore.getState().getFilteredArtifacts();
      expect(filtered).toHaveLength(2);
      expect(filtered.every((a) => a.subject === "Math")).toBe(true);
    });

    it("getFilteredArtifacts respects type filter", () => {
      useArtifactStore.setState({
        artifacts: [mockArtifact, mockArtifact2, mockArtifact3],
        filters: {
          projects: [],
          grades: [],
          subjects: [],
          types: ["answer_key"],
          objectiveTags: [],
        },
      });

      const filtered = useArtifactStore.getState().getFilteredArtifacts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe("answer_key");
    });

    it("getFilteredArtifacts respects project filter", () => {
      useArtifactStore.setState({
        artifacts: [mockArtifact, mockArtifact2, mockArtifact3],
        filters: {
          projects: ["project-2"],
          grades: [],
          subjects: [],
          types: [],
          objectiveTags: [],
        },
      });

      const filtered = useArtifactStore.getState().getFilteredArtifacts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].projectId).toBe("project-2");
    });

    it("getFilteredArtifacts respects objective tag filter", () => {
      useArtifactStore.setState({
        artifacts: [mockArtifact, mockArtifact2, mockArtifact3],
        filters: {
          projects: [],
          grades: [],
          subjects: [],
          types: [],
          objectiveTags: ["K.READING.PHONICS"],
        },
      });

      const filtered = useArtifactStore.getState().getFilteredArtifacts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].objectiveTags).toContain("K.READING.PHONICS");
    });

    it("getFilteredArtifacts respects search query", () => {
      useArtifactStore.setState({
        artifacts: [mockArtifact, mockArtifact2, mockArtifact3],
        searchQuery: "reading",
      });

      const filtered = useArtifactStore.getState().getFilteredArtifacts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title.toLowerCase()).toContain("reading");
    });

    it("getFilteredArtifacts sorts by date descending", () => {
      const older = { ...mockArtifact, artifactId: "old", createdAt: "2024-01-01T00:00:00Z" };
      const newer = { ...mockArtifact2, artifactId: "new", createdAt: "2024-12-01T00:00:00Z" };

      useArtifactStore.setState({
        artifacts: [older, newer],
        sortBy: "date_desc",
      });

      const filtered = useArtifactStore.getState().getFilteredArtifacts();
      expect(filtered[0].artifactId).toBe("new");
      expect(filtered[1].artifactId).toBe("old");
    });

    it("getFilteredArtifacts sorts by date ascending", () => {
      const older = { ...mockArtifact, artifactId: "old", createdAt: "2024-01-01T00:00:00Z" };
      const newer = { ...mockArtifact2, artifactId: "new", createdAt: "2024-12-01T00:00:00Z" };

      useArtifactStore.setState({
        artifacts: [newer, older],
        sortBy: "date_asc",
      });

      const filtered = useArtifactStore.getState().getFilteredArtifacts();
      expect(filtered[0].artifactId).toBe("old");
      expect(filtered[1].artifactId).toBe("new");
    });

    it("getFilteredArtifacts sorts by title ascending", () => {
      const a = { ...mockArtifact, artifactId: "a", title: "Alpha" };
      const b = { ...mockArtifact2, artifactId: "b", title: "Beta" };

      useArtifactStore.setState({
        artifacts: [b, a],
        sortBy: "title_asc",
      });

      const filtered = useArtifactStore.getState().getFilteredArtifacts();
      expect(filtered[0].artifactId).toBe("a");
      expect(filtered[1].artifactId).toBe("b");
    });

    it("getFilteredArtifacts sorts by grade", () => {
      const k = { ...mockArtifact, artifactId: "k", grade: "K" as const };
      const g2 = { ...mockArtifact2, artifactId: "g2", grade: "2" as const };

      useArtifactStore.setState({
        artifacts: [g2, k],
        sortBy: "grade",
      });

      const filtered = useArtifactStore.getState().getFilteredArtifacts();
      expect(filtered[0].artifactId).toBe("k");
      expect(filtered[1].artifactId).toBe("g2");
    });
  });

  describe("UI state actions", () => {
    it("setViewMode changes view mode", () => {
      useArtifactStore.getState().setViewMode("list");
      expect(useArtifactStore.getState().viewMode).toBe("list");

      useArtifactStore.getState().setViewMode("grid");
      expect(useArtifactStore.getState().viewMode).toBe("grid");
    });

    it("setSortBy changes sort option", () => {
      useArtifactStore.getState().setSortBy("title_asc");
      expect(useArtifactStore.getState().sortBy).toBe("title_asc");
    });

    it("setFilters updates filters", () => {
      useArtifactStore.getState().setFilters({ grades: ["K", "1"] });
      expect(useArtifactStore.getState().filters.grades).toEqual(["K", "1"]);
    });

    it("setFilters merges with existing filters", () => {
      useArtifactStore.getState().setFilters({ grades: ["K"] });
      useArtifactStore.getState().setFilters({ subjects: ["Math"] });

      const { filters } = useArtifactStore.getState();
      expect(filters.grades).toEqual(["K"]);
      expect(filters.subjects).toEqual(["Math"]);
    });

    it("clearFilters resets all filters", () => {
      useArtifactStore.setState({
        filters: {
          projects: ["p1"],
          grades: ["K", "1"],
          subjects: ["Math"],
          types: ["student_page"],
          objectiveTags: ["tag1"],
        },
        searchQuery: "test",
      });

      useArtifactStore.getState().clearFilters();

      const { filters, searchQuery } = useArtifactStore.getState();
      expect(filters.projects).toEqual([]);
      expect(filters.grades).toEqual([]);
      expect(filters.subjects).toEqual([]);
      expect(filters.types).toEqual([]);
      expect(filters.objectiveTags).toEqual([]);
      expect(searchQuery).toBe("");
    });

    it("setSearchQuery updates search query", () => {
      useArtifactStore.getState().setSearchQuery("worksheet");
      expect(useArtifactStore.getState().searchQuery).toBe("worksheet");
    });

    it("setCurrentArtifact updates current artifact", () => {
      const fullArtifact: LocalArtifact = {
        ...mockArtifact,
        htmlContent: "<h1>Test</h1>",
      };

      useArtifactStore.getState().setCurrentArtifact(fullArtifact);
      expect(useArtifactStore.getState().currentArtifact).toEqual(fullArtifact);
    });
  });

  describe("error handling", () => {
    it("can set and clear errors", () => {
      useArtifactStore.setState({
        error: "Test error",
      });

      expect(useArtifactStore.getState().error).toBe("Test error");

      useArtifactStore.getState().clearError();

      expect(useArtifactStore.getState().error).toBeNull();
    });
  });

  describe("reset", () => {
    it("resets all state to defaults", () => {
      useArtifactStore.setState({
        artifacts: [mockArtifact],
        isLoading: true,
        error: "some error",
        currentArtifact: { ...mockArtifact, htmlContent: "<h1>Test</h1>" },
        isLoadingCurrent: true,
        viewMode: "list",
        sortBy: "title_asc",
        filters: {
          projects: ["p1"],
          grades: ["K"],
          subjects: ["Math"],
          types: ["student_page"],
          objectiveTags: ["tag1"],
        },
        searchQuery: "test",
      });

      useArtifactStore.getState().reset();

      const state = useArtifactStore.getState();
      expect(state.artifacts).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.currentArtifact).toBeNull();
      expect(state.isLoadingCurrent).toBe(false);
      expect(state.viewMode).toBe("grid");
      expect(state.sortBy).toBe("date_desc");
      expect(state.filters.projects).toEqual([]);
      expect(state.searchQuery).toBe("");
    });
  });
});

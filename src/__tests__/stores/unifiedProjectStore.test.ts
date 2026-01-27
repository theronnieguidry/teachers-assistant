import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUnifiedProjectStore } from "@/stores/unifiedProjectStore";
import type { UnifiedProject } from "@/types";

// Mock the local-project-storage service
vi.mock("@/services/local-project-storage", () => ({
  getLocalProjects: vi.fn().mockResolvedValue([]),
  getLocalProject: vi.fn().mockResolvedValue(null),
  createLocalProject: vi.fn().mockImplementation((data) =>
    Promise.resolve({
      projectId: "test-project-id",
      type: data.type,
      name: data.name,
      grade: data.grade,
      gradeBand: data.grade === "K" ? "K" : data.grade <= "3" ? data.grade : "4-6",
      subjectFocus: data.subjectFocus || [],
      artifactIds: [],
      status: "pending",
      lastActivityDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  ),
  updateLocalProject: vi.fn().mockImplementation((projectId, updates) =>
    Promise.resolve({ projectId, ...updates })
  ),
  deleteLocalProject: vi.fn().mockResolvedValue(undefined),
  getProjectsByType: vi.fn().mockResolvedValue([]),
  addArtifactToProject: vi.fn().mockResolvedValue(undefined),
  linkObjectiveToProject: vi.fn().mockResolvedValue(undefined),
  unlinkObjectiveFromProject: vi.fn().mockResolvedValue(undefined),
  getProjectSummaries: vi.fn().mockResolvedValue([]),
  getMostRecentProject: vi.fn().mockResolvedValue(null),
  setProjectDesignPack: vi.fn().mockResolvedValue(undefined),
}));

const mockProject: UnifiedProject = {
  projectId: "test-project-1",
  type: "quick_create",
  name: "Test Math Worksheets",
  grade: "2",
  gradeBand: "2",
  subjectFocus: ["Math"],
  artifactIds: [],
  status: "pending",
  lastActivityDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockLearningPathProject: UnifiedProject = {
  projectId: "test-lp-1",
  type: "learning_path",
  name: "Math Learning Path",
  grade: "K",
  gradeBand: "K",
  subjectFocus: ["Math"],
  learnerId: "learner-1",
  linkedObjectiveIds: ["K.MATH.COUNT.1_20"],
  artifactIds: [],
  status: "pending",
  lastActivityDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("unifiedProjectStore", () => {
  beforeEach(() => {
    // Reset store state
    useUnifiedProjectStore.setState({
      projects: [],
      isLoading: false,
      error: null,
      currentProjectId: null,
      currentProject: null,
      summaries: [],
    });
    vi.clearAllMocks();
    // Clear localStorage mock
    localStorage.clear();
  });

  describe("initial state", () => {
    it("starts with empty projects", () => {
      const { projects } = useUnifiedProjectStore.getState();
      expect(projects).toEqual([]);
    });

    it("starts with no current project", () => {
      const { currentProjectId, currentProject } = useUnifiedProjectStore.getState();
      expect(currentProjectId).toBeNull();
      expect(currentProject).toBeNull();
    });

    it("starts with empty summaries", () => {
      const { summaries } = useUnifiedProjectStore.getState();
      expect(summaries).toEqual([]);
    });
  });

  describe("computed helpers", () => {
    it("getProjectById returns correct project", () => {
      useUnifiedProjectStore.setState({
        projects: [mockProject, mockLearningPathProject],
      });

      const project = useUnifiedProjectStore.getState().getProjectById("test-project-1");
      expect(project).toEqual(mockProject);
    });

    it("getProjectById returns null for non-existent project", () => {
      useUnifiedProjectStore.setState({
        projects: [mockProject],
      });

      const project = useUnifiedProjectStore.getState().getProjectById("non-existent");
      expect(project).toBeNull();
    });

    it("getLearningPathProjects returns only learning path projects", () => {
      useUnifiedProjectStore.setState({
        projects: [mockProject, mockLearningPathProject],
      });

      const lpProjects = useUnifiedProjectStore.getState().getLearningPathProjects();
      expect(lpProjects).toHaveLength(1);
      expect(lpProjects[0].type).toBe("learning_path");
    });

    it("getQuickCreateProjects returns only quick create projects", () => {
      useUnifiedProjectStore.setState({
        projects: [mockProject, mockLearningPathProject],
      });

      const qcProjects = useUnifiedProjectStore.getState().getQuickCreateProjects();
      expect(qcProjects).toHaveLength(1);
      expect(qcProjects[0].type).toBe("quick_create");
    });

    it("getProjectsByLearner returns projects for specific learner", () => {
      useUnifiedProjectStore.setState({
        projects: [mockProject, mockLearningPathProject],
      });

      const learnerProjects = useUnifiedProjectStore.getState().getProjectsByLearner("learner-1");
      expect(learnerProjects).toHaveLength(1);
      expect(learnerProjects[0].learnerId).toBe("learner-1");
    });

    it("getCurrentProject returns current project when set", () => {
      useUnifiedProjectStore.setState({
        projects: [mockProject],
        currentProjectId: "test-project-1",
      });

      const currentProject = useUnifiedProjectStore.getState().getCurrentProject();
      expect(currentProject).toEqual(mockProject);
    });

    it("getCurrentProject returns null when no current project", () => {
      useUnifiedProjectStore.setState({
        projects: [mockProject],
        currentProjectId: null,
      });

      const currentProject = useUnifiedProjectStore.getState().getCurrentProject();
      expect(currentProject).toBeNull();
    });
  });

  describe("project management", () => {
    it("can add a project", () => {
      useUnifiedProjectStore.setState({
        projects: [mockProject],
      });

      const { projects } = useUnifiedProjectStore.getState();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe("Test Math Worksheets");
    });

    it("can set current project", () => {
      useUnifiedProjectStore.setState({
        projects: [mockProject],
      });

      useUnifiedProjectStore.getState().setCurrentProject("test-project-1");

      const { currentProjectId, currentProject } = useUnifiedProjectStore.getState();
      expect(currentProjectId).toBe("test-project-1");
      expect(currentProject).toEqual(mockProject);
    });

    it("can clear current project", () => {
      useUnifiedProjectStore.setState({
        projects: [mockProject],
        currentProjectId: "test-project-1",
        currentProject: mockProject,
      });

      useUnifiedProjectStore.getState().setCurrentProject(null);

      const { currentProjectId, currentProject } = useUnifiedProjectStore.getState();
      expect(currentProjectId).toBeNull();
      expect(currentProject).toBeNull();
    });
  });

  describe("artifact management", () => {
    it("addArtifact updates project artifact list", async () => {
      useUnifiedProjectStore.setState({
        projects: [{ ...mockProject, artifactIds: [] }],
        currentProjectId: "test-project-1",
        currentProject: { ...mockProject, artifactIds: [] },
      });

      await useUnifiedProjectStore.getState().addArtifact("test-project-1", "artifact-1");

      const { projects, currentProject } = useUnifiedProjectStore.getState();
      expect(projects[0].artifactIds).toContain("artifact-1");
      expect(currentProject?.artifactIds).toContain("artifact-1");
    });

    it("addArtifact does not duplicate artifact IDs", async () => {
      useUnifiedProjectStore.setState({
        projects: [{ ...mockProject, artifactIds: ["artifact-1"] }],
        currentProjectId: "test-project-1",
        currentProject: { ...mockProject, artifactIds: ["artifact-1"] },
      });

      await useUnifiedProjectStore.getState().addArtifact("test-project-1", "artifact-1");

      const { projects } = useUnifiedProjectStore.getState();
      expect(projects[0].artifactIds).toEqual(["artifact-1"]);
    });
  });

  describe("objective management", () => {
    it("linkObjective adds objective to project", async () => {
      useUnifiedProjectStore.setState({
        projects: [{ ...mockLearningPathProject, linkedObjectiveIds: [] }],
      });

      await useUnifiedProjectStore.getState().linkObjective("test-lp-1", "K.MATH.ADD.BASIC");

      const { projects } = useUnifiedProjectStore.getState();
      expect(projects[0].linkedObjectiveIds).toContain("K.MATH.ADD.BASIC");
    });

    it("unlinkObjective removes objective from project", async () => {
      useUnifiedProjectStore.setState({
        projects: [mockLearningPathProject],
      });

      await useUnifiedProjectStore.getState().unlinkObjective("test-lp-1", "K.MATH.COUNT.1_20");

      const { projects } = useUnifiedProjectStore.getState();
      expect(projects[0].linkedObjectiveIds).not.toContain("K.MATH.COUNT.1_20");
    });
  });

  describe("design pack management", () => {
    it("setDesignPack updates project design pack", async () => {
      useUnifiedProjectStore.setState({
        projects: [mockProject],
        currentProjectId: "test-project-1",
        currentProject: mockProject,
      });

      await useUnifiedProjectStore.getState().setDesignPack("test-project-1", "pack-1");

      const { projects, currentProject } = useUnifiedProjectStore.getState();
      expect(projects[0].defaultDesignPackId).toBe("pack-1");
      expect(currentProject?.defaultDesignPackId).toBe("pack-1");
    });
  });

  describe("error handling", () => {
    it("can set and clear errors", () => {
      useUnifiedProjectStore.setState({
        error: "Test error",
      });

      expect(useUnifiedProjectStore.getState().error).toBe("Test error");

      useUnifiedProjectStore.getState().clearError();

      expect(useUnifiedProjectStore.getState().error).toBeNull();
    });
  });

  describe("reset", () => {
    it("resets all state to defaults", () => {
      useUnifiedProjectStore.setState({
        projects: [mockProject],
        isLoading: true,
        error: "some error",
        currentProjectId: "test-project-1",
        currentProject: mockProject,
        summaries: [{ projectId: "test-project-1", type: "quick_create", name: "Test", grade: "2", subjectFocus: [], lastActivityDate: "", artifactCount: 0 }],
      });

      useUnifiedProjectStore.getState().reset();

      const state = useUnifiedProjectStore.getState();
      expect(state.projects).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.currentProjectId).toBeNull();
      expect(state.currentProject).toBeNull();
      expect(state.summaries).toEqual([]);
    });
  });
});

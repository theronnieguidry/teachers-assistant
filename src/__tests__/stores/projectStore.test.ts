import { describe, it, expect, beforeEach, vi } from "vitest";
import { useProjectStore } from "@/stores/projectStore";
import { supabase } from "@/services/supabase";

// Mock supabase
vi.mock("@/services/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

const mockDbProject = {
  id: "project-123",
  user_id: "user-123",
  title: "Test Project",
  description: null,
  prompt: "Create a math worksheet",
  grade: "2",
  subject: "Math",
  options: {},
  inspiration: [],
  output_path: null,
  status: "pending",
  error_message: null,
  credits_used: 0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  completed_at: null,
};

const mockProject = {
  id: "project-123",
  userId: "user-123",
  title: "Test Project",
  description: null,
  prompt: "Create a math worksheet",
  grade: "2",
  subject: "Math",
  options: {},
  inspiration: [],
  outputPath: null,
  status: "pending",
  errorMessage: null,
  creditsUsed: 0,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  completedAt: null,
};

describe("projectStore", () => {
  beforeEach(() => {
    // Reset store state
    useProjectStore.setState({
      projects: [],
      currentProject: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have empty initial state", () => {
      const state = useProjectStore.getState();
      expect(state.projects).toEqual([]);
      expect(state.currentProject).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchProjects", () => {
    it("should fetch and set projects", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockDbProject],
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useProjectStore.getState().fetchProjects();

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].id).toBe("project-123");
      expect(state.projects[0].userId).toBe("user-123");
      expect(state.isLoading).toBe(false);
    });

    it("should handle empty projects list", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useProjectStore.getState().fetchProjects();

      expect(useProjectStore.getState().projects).toEqual([]);
    });

    it("should set error on fetch failure", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Database error"),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useProjectStore.getState().fetchProjects();

      expect(useProjectStore.getState().error).toBe("Database error");
    });

    it("should set loading state during fetch", async () => {
      let resolveQuery: (value: unknown) => void;
      const queryPromise = new Promise((resolve) => {
        resolveQuery = resolve;
      });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(queryPromise),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const fetchCall = useProjectStore.getState().fetchProjects();

      // Loading should be true during fetch
      expect(useProjectStore.getState().isLoading).toBe(true);

      resolveQuery!({ data: [], error: null });
      await fetchCall;

      expect(useProjectStore.getState().isLoading).toBe(false);
    });
  });

  describe("setCurrentProject", () => {
    it("should set current project", () => {
      useProjectStore.getState().setCurrentProject(mockProject as never);

      expect(useProjectStore.getState().currentProject).toEqual(mockProject);
    });

    it("should clear current project when set to null", () => {
      useProjectStore.setState({ currentProject: mockProject as never });

      useProjectStore.getState().setCurrentProject(null);

      expect(useProjectStore.getState().currentProject).toBeNull();
    });
  });

  describe("createProject", () => {
    it("should create project and add to list", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbProject,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const result = await useProjectStore.getState().createProject({
        title: "Test Project",
        prompt: "Create a math worksheet",
        grade: "2",
        subject: "Math",
      });

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].title).toBe("Test Project");
      expect(state.currentProject?.id).toBe("project-123");
      expect(result.id).toBe("project-123");
    });

    it("should throw error when not authenticated", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      await expect(
        useProjectStore.getState().createProject({
          title: "Test",
          prompt: "Test prompt",
          grade: "2",
          subject: "Math",
        })
      ).rejects.toThrow("Not authenticated");

      expect(useProjectStore.getState().error).toBe("Not authenticated");
    });

    it("should handle creation error", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Insert failed"),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await expect(
        useProjectStore.getState().createProject({
          title: "Test",
          prompt: "Test prompt",
          grade: "2",
          subject: "Math",
        })
      ).rejects.toThrow("Insert failed");
    });

    it("should prepend new project to list", async () => {
      // Set up existing project
      useProjectStore.setState({
        projects: [mockProject as never],
      });

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      const newDbProject = {
        ...mockDbProject,
        id: "project-456",
        title: "New Project",
      };

      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: newDbProject,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useProjectStore.getState().createProject({
        title: "New Project",
        prompt: "New prompt",
        grade: "3",
        subject: "Science",
      });

      const projects = useProjectStore.getState().projects;
      expect(projects).toHaveLength(2);
      expect(projects[0].title).toBe("New Project"); // New project first
      expect(projects[1].title).toBe("Test Project");
    });
  });

  describe("updateProject", () => {
    it("should update project in list", async () => {
      useProjectStore.setState({
        projects: [mockProject as never],
        currentProject: mockProject as never,
      });

      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useProjectStore.getState().updateProject("project-123", {
        title: "Updated Title",
        status: "completed",
      });

      const state = useProjectStore.getState();
      expect(state.projects[0].title).toBe("Updated Title");
      expect(state.projects[0].status).toBe("completed");
      expect(state.currentProject?.title).toBe("Updated Title");
    });

    it("should not update other projects", async () => {
      const project2 = { ...mockProject, id: "project-456", title: "Other" };
      useProjectStore.setState({
        projects: [mockProject as never, project2 as never],
      });

      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useProjectStore.getState().updateProject("project-123", {
        title: "Updated",
      });

      const projects = useProjectStore.getState().projects;
      expect(projects[0].title).toBe("Updated");
      expect(projects[1].title).toBe("Other"); // unchanged
    });

    it("should not update currentProject if different id", async () => {
      const otherProject = { ...mockProject, id: "project-456" };
      useProjectStore.setState({
        projects: [mockProject as never],
        currentProject: otherProject as never,
      });

      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useProjectStore.getState().updateProject("project-123", {
        title: "Updated",
      });

      expect(useProjectStore.getState().currentProject?.title).toBe("Test Project");
    });

    it("should handle update error", async () => {
      useProjectStore.setState({
        projects: [mockProject as never],
      });

      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Update failed"),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await expect(
        useProjectStore.getState().updateProject("project-123", { title: "Updated" })
      ).rejects.toThrow("Update failed");
    });
  });

  describe("deleteProject", () => {
    it("should remove project from list", async () => {
      useProjectStore.setState({
        projects: [mockProject as never],
        currentProject: mockProject as never,
      });

      const mockQueryBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useProjectStore.getState().deleteProject("project-123");

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(0);
      expect(state.currentProject).toBeNull();
    });

    it("should not clear currentProject if deleting different project", async () => {
      const project2 = { ...mockProject, id: "project-456" };
      useProjectStore.setState({
        projects: [mockProject as never, project2 as never],
        currentProject: project2 as never,
      });

      const mockQueryBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useProjectStore.getState().deleteProject("project-123");

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.currentProject?.id).toBe("project-456");
    });

    it("should handle delete error", async () => {
      useProjectStore.setState({
        projects: [mockProject as never],
      });

      const mockQueryBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Delete failed"),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await expect(
        useProjectStore.getState().deleteProject("project-123")
      ).rejects.toThrow("Delete failed");
    });
  });

  describe("clearError", () => {
    it("should clear error", () => {
      useProjectStore.setState({ error: "Some error" });

      useProjectStore.getState().clearError();

      expect(useProjectStore.getState().error).toBeNull();
    });
  });
});

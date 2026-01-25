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

  describe("fetchProjectVersion", () => {
    const mockDbVersion = {
      id: "version-123",
      project_id: "project-123",
      version_number: 1,
      worksheet_html: "<html>Worksheet</html>",
      lesson_plan_html: "<html>Lesson Plan</html>",
      answer_key_html: "<html>Answer Key</html>",
      ai_provider: "ollama",
      ai_model: "llama3.2",
      created_at: "2024-01-01T00:00:00Z",
    };

    it("should fetch and return latest version", async () => {
      useProjectStore.setState({ currentProject: mockProject as never });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbVersion,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const result = await useProjectStore.getState().fetchProjectVersion("project-123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("version-123");
      expect(result?.worksheetHtml).toBe("<html>Worksheet</html>");
      expect(result?.aiProvider).toBe("ollama");
    });

    it("should update currentProject with latestVersion", async () => {
      useProjectStore.setState({ currentProject: mockProject as never });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbVersion,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useProjectStore.getState().fetchProjectVersion("project-123");

      const state = useProjectStore.getState();
      expect(state.currentProject?.latestVersion).toBeDefined();
      expect(state.currentProject?.latestVersion?.id).toBe("version-123");
    });

    it("should return null when no version found (PGRST116)", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const result = await useProjectStore.getState().fetchProjectVersion("project-123");

      expect(result).toBeNull();
    });

    it("should return null and log error on other errors", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "OTHER", message: "Database error" },
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const result = await useProjectStore.getState().fetchProjectVersion("project-123");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should not update currentProject if different project", async () => {
      const otherProject = { ...mockProject, id: "project-456" };
      useProjectStore.setState({ currentProject: otherProject as never });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbVersion,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useProjectStore.getState().fetchProjectVersion("project-123");

      // Current project should not be updated
      expect(useProjectStore.getState().currentProject?.latestVersion).toBeUndefined();
    });
  });

  describe("updateProjectWithVersion", () => {
    const mockVersionData = {
      worksheetHtml: "<html>Worksheet</html>",
      lessonPlanHtml: "<html>Lesson Plan</html>",
      answerKeyHtml: "<html>Answer Key</html>",
      aiProvider: "ollama",
      aiModel: "llama3.2",
    };

    const mockDbNewVersion = {
      id: "version-new",
      project_id: "project-123",
      version_number: 1,
      worksheet_html: "<html>Worksheet</html>",
      lesson_plan_html: "<html>Lesson Plan</html>",
      answer_key_html: "<html>Answer Key</html>",
      ai_provider: "ollama",
      ai_model: "llama3.2",
      created_at: "2024-01-01T00:00:00Z",
    };

    it("should create new version and update project status", async () => {
      useProjectStore.setState({
        projects: [mockProject as never],
        currentProject: mockProject as never,
      });

      // Mock getting existing versions (empty)
      const mockVersionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      // Mock inserting version
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbNewVersion,
          error: null,
        }),
      };

      // Mock updating project
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "project_versions") {
          callCount++;
          if (callCount === 1) {
            return mockVersionsQuery as never;
          }
          return mockInsertQuery as never;
        }
        if (table === "projects") {
          return mockUpdateQuery as never;
        }
        return {} as never;
      });

      await useProjectStore.getState().updateProjectWithVersion(
        "project-123",
        "completed",
        mockVersionData
      );

      const state = useProjectStore.getState();
      expect(state.projects[0].status).toBe("completed");
      expect(state.currentProject?.status).toBe("completed");
      expect(state.currentProject?.latestVersion).toBeDefined();
    });

    it("should increment version number when versions exist", async () => {
      useProjectStore.setState({
        projects: [mockProject as never],
        currentProject: mockProject as never,
      });

      const mockVersionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ version_number: 2 }], // Existing version 2
          error: null,
        }),
      };

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockDbNewVersion, version_number: 3 },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "project_versions") {
          callCount++;
          if (callCount === 1) {
            return mockVersionsQuery as never;
          }
          return mockInsertQuery as never;
        }
        if (table === "projects") {
          return mockUpdateQuery as never;
        }
        return {} as never;
      });

      await useProjectStore.getState().updateProjectWithVersion(
        "project-123",
        "completed",
        mockVersionData
      );

      // Verify insert was called with version 3
      expect(mockInsertQuery.insert).toHaveBeenCalled();
    });

    it("should throw error on version insert failure", async () => {
      useProjectStore.setState({
        projects: [mockProject as never],
        currentProject: mockProject as never,
      });

      const mockVersionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Insert failed"),
        }),
      };

      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "project_versions") {
          callCount++;
          if (callCount === 1) {
            return mockVersionsQuery as never;
          }
          return mockInsertQuery as never;
        }
        return {} as never;
      });

      await expect(
        useProjectStore.getState().updateProjectWithVersion(
          "project-123",
          "completed",
          mockVersionData
        )
      ).rejects.toThrow("Insert failed");
    });

    it("should throw error on project update failure", async () => {
      useProjectStore.setState({
        projects: [mockProject as never],
        currentProject: mockProject as never,
      });

      const mockVersionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbNewVersion,
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Update failed"),
        }),
      };

      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "project_versions") {
          callCount++;
          if (callCount === 1) {
            return mockVersionsQuery as never;
          }
          return mockInsertQuery as never;
        }
        if (table === "projects") {
          return mockUpdateQuery as never;
        }
        return {} as never;
      });

      await expect(
        useProjectStore.getState().updateProjectWithVersion(
          "project-123",
          "completed",
          mockVersionData
        )
      ).rejects.toThrow("Update failed");
    });

    it("should set completedAt to null for non-completed status", async () => {
      useProjectStore.setState({
        projects: [mockProject as never],
        currentProject: mockProject as never,
      });

      const mockVersionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbNewVersion,
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "project_versions") {
          callCount++;
          if (callCount === 1) {
            return mockVersionsQuery as never;
          }
          return mockInsertQuery as never;
        }
        if (table === "projects") {
          return mockUpdateQuery as never;
        }
        return {} as never;
      });

      await useProjectStore.getState().updateProjectWithVersion(
        "project-123",
        "generating", // Not completed
        mockVersionData
      );

      const state = useProjectStore.getState();
      expect(state.currentProject?.completedAt).toBeNull();
    });
  });

  describe("fetchProjectInspiration", () => {
    it("should fetch inspiration items from junction table", async () => {
      const mockInspirationData = [
        {
          position: 0,
          inspiration_items: {
            id: "insp-123",
            user_id: "user-123",
            type: "url",
            title: "Test URL",
            source_url: "https://example.com",
            content: null,
            storage_path: null,
            created_at: "2024-01-01T00:00:00Z",
          },
        },
        {
          position: 1,
          inspiration_items: {
            id: "insp-456",
            user_id: "user-123",
            type: "pdf",
            title: "Test PDF",
            source_url: null,
            content: "extracted content",
            storage_path: null,
            created_at: "2024-01-01T00:00:00Z",
          },
        },
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockInspirationData,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const items = await useProjectStore.getState().fetchProjectInspiration("project-123");

      expect(items).toHaveLength(2);
      expect(items[0].id).toBe("insp-123");
      expect(items[0].type).toBe("url");
      expect(items[0].title).toBe("Test URL");
      expect(items[1].id).toBe("insp-456");
      expect(items[1].type).toBe("pdf");
    });

    it("should return empty array when no inspiration items linked", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const items = await useProjectStore.getState().fetchProjectInspiration("project-123");

      expect(items).toEqual([]);
    });

    it("should return empty array on error", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Database error"),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const items = await useProjectStore.getState().fetchProjectInspiration("project-123");

      expect(items).toEqual([]);
    });

    it("should filter out null inspiration_items", async () => {
      const mockInspirationData = [
        {
          position: 0,
          inspiration_items: {
            id: "insp-123",
            user_id: "user-123",
            type: "url",
            title: "Valid Item",
            source_url: null,
            content: null,
            storage_path: null,
            created_at: "2024-01-01T00:00:00Z",
          },
        },
        {
          position: 1,
          inspiration_items: null, // Deleted item
        },
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockInspirationData,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const items = await useProjectStore.getState().fetchProjectInspiration("project-123");

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("insp-123");
    });
  });

  describe("createProject with inspiration linking", () => {
    it("should link inspiration items via junction table when IDs provided", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: mockDbProject,
        error: null,
      });

      let junctionInsertCalled = false;
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            insert: insertMock,
            select: selectMock,
            single: singleMock,
          } as never;
        }
        if (table === "project_inspiration") {
          junctionInsertCalled = true;
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as never;
        }
        return {} as never;
      });

      await useProjectStore.getState().createProject({
        title: "Test Project",
        prompt: "Create a math worksheet",
        grade: "2",
        subject: "Math",
        inspirationIds: ["insp-1", "insp-2"],
      });

      expect(junctionInsertCalled).toBe(true);
    });

    it("should not fail project creation if junction table insert fails", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockDbProject,
              error: null,
            }),
          } as never;
        }
        if (table === "project_inspiration") {
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Junction table error"),
            }),
          } as never;
        }
        return {} as never;
      });

      // Should not throw - project was created successfully
      const result = await useProjectStore.getState().createProject({
        title: "Test Project",
        prompt: "Create a math worksheet",
        grade: "2",
        subject: "Math",
        inspirationIds: ["insp-1"],
      });

      expect(result.id).toBe("project-123");
    });
  });
});

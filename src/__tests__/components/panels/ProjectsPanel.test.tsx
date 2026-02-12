import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../utils";
import { ProjectsPanel } from "@/components/panels/ProjectsPanel";

// Mock data
const mockProjects = [
  {
    id: "project-1",
    userId: "user-123",
    title: "Math Worksheet",
    description: null,
    prompt: "Create a math worksheet",
    grade: "2",
    subject: "Math",
    options: {},
    inspiration: [],
    outputPath: null,
    status: "completed",
    errorMessage: null,
    creditsUsed: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: new Date(),
  },
  {
    id: "project-2",
    userId: "user-123",
    title: "Science Quiz",
    description: null,
    prompt: "Create a science quiz",
    grade: "3",
    subject: "Science",
    options: {},
    inspiration: [],
    outputPath: null,
    status: "pending",
    errorMessage: null,
    creditsUsed: 0,
    createdAt: new Date(Date.now() - 86400000), // Yesterday
    updatedAt: new Date(),
    completedAt: null,
  },
];

// Mock projectStore
const mockFetchProjects = vi.fn();
const mockSetCurrentProject = vi.fn();
const mockDeleteProject = vi.fn();
const mockOpenFolder = vi.fn();
const mockIsTauriContext = vi.fn(() => true);

let mockStoreState = {
  projects: [] as typeof mockProjects,
  currentProject: null as (typeof mockProjects)[0] | null,
  isLoading: false,
  fetchProjects: mockFetchProjects,
  setCurrentProject: mockSetCurrentProject,
  deleteProject: mockDeleteProject,
  createProject: vi.fn(),
};

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: () => mockStoreState,
}));

vi.mock("@/services/tauri-bridge", () => ({
  openFolder: (...args: unknown[]) => mockOpenFolder(...args),
  isTauriContext: () => mockIsTauriContext(),
}));

vi.mock("@/stores/toastStore", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("ProjectsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("confirm", vi.fn(() => true));
    mockStoreState = {
      projects: [],
      currentProject: null,
      isLoading: false,
      fetchProjects: mockFetchProjects,
      setCurrentProject: mockSetCurrentProject,
      deleteProject: mockDeleteProject,
      createProject: vi.fn(),
    };
  });

  describe("rendering", () => {
    it("should render panel with Projects title", () => {
      render(<ProjectsPanel />);

      expect(screen.getByText("Projects")).toBeInTheDocument();
    });

    it("should render refresh button", () => {
      render(<ProjectsPanel />);

      expect(screen.getByRole("button", { name: /refresh projects/i })).toBeInTheDocument();
    });

    it("should call fetchProjects on mount", () => {
      render(<ProjectsPanel />);

      expect(mockFetchProjects).toHaveBeenCalled();
    });
  });

  describe("empty state", () => {
    it("should show empty state when no projects", () => {
      render(<ProjectsPanel />);

      expect(screen.getByText("No projects yet")).toBeInTheDocument();
      expect(screen.getByText("Create your first teaching material above")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show loading spinner when loading and no projects", () => {
      mockStoreState.isLoading = true;

      render(<ProjectsPanel />);

      // Look for the spinner element (Loader2 has animate-spin class)
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("with projects", () => {
    beforeEach(() => {
      mockStoreState.projects = mockProjects;
    });

    it("should render list of projects", () => {
      render(<ProjectsPanel />);

      expect(screen.getByText("Math Worksheet")).toBeInTheDocument();
      expect(screen.getByText("Science Quiz")).toBeInTheDocument();
    });

    it("should display grade and subject for each project", () => {
      render(<ProjectsPanel />);

      expect(screen.getByText(/Grade 2 • Math/)).toBeInTheDocument();
      expect(screen.getByText(/Grade 3 • Science/)).toBeInTheDocument();
    });

    it("should display status indicator", () => {
      render(<ProjectsPanel />);

      // Check for status dots with the correct colors
      const statusDots = document.querySelectorAll(".rounded-full");
      expect(statusDots.length).toBeGreaterThan(0);
    });

    it("should call setCurrentProject when clicking a project", async () => {
      const { user } = render(<ProjectsPanel />);

      await user.click(screen.getByText("Math Worksheet"));

      expect(mockSetCurrentProject).toHaveBeenCalledWith(mockProjects[0]);
    });

    it("should highlight current project", () => {
      mockStoreState.currentProject = mockProjects[0];

      render(<ProjectsPanel />);

      // The current project should have bg-accent class
      const projectDiv = screen.getByText("Math Worksheet").closest(".bg-accent");
      expect(projectDiv).toBeInTheDocument();
    });
  });

  describe("date formatting", () => {
    it("should show 'Today' for today's projects", () => {
      mockStoreState.projects = [
        {
          ...mockProjects[0],
          createdAt: new Date(),
        },
      ];

      render(<ProjectsPanel />);

      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    it("should show 'Yesterday' for yesterday's projects", () => {
      mockStoreState.projects = [
        {
          ...mockProjects[0],
          createdAt: new Date(Date.now() - 86400000),
        },
      ];

      render(<ProjectsPanel />);

      expect(screen.getByText("Yesterday")).toBeInTheDocument();
    });

    it("should show 'X days ago' for recent projects", () => {
      mockStoreState.projects = [
        {
          ...mockProjects[0],
          createdAt: new Date(Date.now() - 3 * 86400000), // 3 days ago
        },
      ];

      render(<ProjectsPanel />);

      expect(screen.getByText("3 days ago")).toBeInTheDocument();
    });
  });

  describe("project actions", () => {
    beforeEach(() => {
      mockStoreState.projects = mockProjects;
    });

    it("should show action buttons on hover", () => {
      render(<ProjectsPanel />);

      // Action buttons exist but are hidden (opacity-0)
      const deleteButtons = screen.getAllByTitle("Delete");
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("should have refresh projects button", async () => {
      const { user } = render(<ProjectsPanel />);

      await user.click(screen.getByRole("button", { name: /refresh projects/i }));

      // Called once on mount, once on click
      expect(mockFetchProjects).toHaveBeenCalledTimes(2);
    });

    it("supports multi-select and batch delete", async () => {
      const { user } = render(<ProjectsPanel />);

      await user.click(screen.getByLabelText("Select Math Worksheet"));
      await user.click(screen.getByLabelText("Select Science Quiz"));

      expect(screen.getByText("2 selected")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /delete selected/i }));

      await waitFor(() => {
        expect(mockDeleteProject).toHaveBeenCalledWith("project-1");
        expect(mockDeleteProject).toHaveBeenCalledWith("project-2");
      });
    });

    it("opens folders for selected projects in batch", async () => {
      mockStoreState.projects = [
        { ...mockProjects[0], outputPath: "/tmp/project-1" },
        { ...mockProjects[1], outputPath: "/tmp/project-2" },
      ];

      const { user } = render(<ProjectsPanel />);

      await user.click(screen.getByLabelText("Select Math Worksheet"));
      await user.click(screen.getByLabelText("Select Science Quiz"));
      await user.click(screen.getByRole("button", { name: /open folders/i }));

      await waitFor(() => {
        expect(mockOpenFolder).toHaveBeenCalledWith("/tmp/project-1");
        expect(mockOpenFolder).toHaveBeenCalledWith("/tmp/project-2");
      });
    });
  });
});

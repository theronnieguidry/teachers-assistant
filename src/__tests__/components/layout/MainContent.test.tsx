import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import { MainContent } from "@/components/layout/MainContent";
import { useProjectStore } from "@/stores/projectStore";

// Mock the project store
vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn(),
}));

// Mock child components
vi.mock("@/components/layout/WelcomeScreen", () => ({
  WelcomeScreen: () => <div data-testid="welcome-screen">Welcome Screen</div>,
}));

vi.mock("@/components/preview/ProjectPreview", () => ({
  ProjectPreview: ({ project }: { project: { title: string } }) => (
    <div data-testid="project-preview">Project Preview: {project.title}</div>
  ),
}));

const mockProject = {
  id: "project-123",
  userId: "user-123",
  title: "Math Worksheet",
  description: null,
  prompt: "Create a math worksheet",
  grade: "2" as const,
  subject: "Math",
  options: {},
  inspiration: [],
  outputPath: null,
  status: "completed" as const,
  errorMessage: null,
  creditsUsed: 1,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  completedAt: new Date("2024-01-01"),
};

describe("MainContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("routing logic", () => {
    it("MAIN-001: should render WelcomeScreen when no project is selected", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: null };
        return selector(state as Parameters<typeof selector>[0]);
      });

      render(<MainContent />);

      expect(screen.getByTestId("welcome-screen")).toBeInTheDocument();
      expect(screen.queryByTestId("project-preview")).not.toBeInTheDocument();
    });

    it("MAIN-002: should render ProjectPreview when a project is selected", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: mockProject };
        return selector(state as Parameters<typeof selector>[0]);
      });

      render(<MainContent />);

      expect(screen.getByTestId("project-preview")).toBeInTheDocument();
      expect(screen.queryByTestId("welcome-screen")).not.toBeInTheDocument();
    });

    it("MAIN-003: should pass project to ProjectPreview", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: mockProject };
        return selector(state as Parameters<typeof selector>[0]);
      });

      render(<MainContent />);

      expect(screen.getByText("Project Preview: Math Worksheet")).toBeInTheDocument();
    });
  });

  describe("reactivity", () => {
    it("MAIN-004: should switch from WelcomeScreen to ProjectPreview when project is selected", () => {
      // Start with no project
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: null };
        return selector(state as Parameters<typeof selector>[0]);
      });

      const { rerender } = render(<MainContent />);

      expect(screen.getByTestId("welcome-screen")).toBeInTheDocument();

      // Select a project
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: mockProject };
        return selector(state as Parameters<typeof selector>[0]);
      });

      rerender(<MainContent />);

      expect(screen.getByTestId("project-preview")).toBeInTheDocument();
      expect(screen.queryByTestId("welcome-screen")).not.toBeInTheDocument();
    });

    it("MAIN-005: should switch from ProjectPreview to WelcomeScreen when project is deselected", () => {
      // Start with a project
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: mockProject };
        return selector(state as Parameters<typeof selector>[0]);
      });

      const { rerender } = render(<MainContent />);

      expect(screen.getByTestId("project-preview")).toBeInTheDocument();

      // Deselect project
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: null };
        return selector(state as Parameters<typeof selector>[0]);
      });

      rerender(<MainContent />);

      expect(screen.getByTestId("welcome-screen")).toBeInTheDocument();
      expect(screen.queryByTestId("project-preview")).not.toBeInTheDocument();
    });

    it("MAIN-006: should update ProjectPreview when different project is selected", () => {
      const project1 = { ...mockProject, id: "project-1", title: "Project One" };
      const project2 = { ...mockProject, id: "project-2", title: "Project Two" };

      // Start with project 1
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: project1 };
        return selector(state as Parameters<typeof selector>[0]);
      });

      const { rerender } = render(<MainContent />);

      expect(screen.getByText("Project Preview: Project One")).toBeInTheDocument();

      // Switch to project 2
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: project2 };
        return selector(state as Parameters<typeof selector>[0]);
      });

      rerender(<MainContent />);

      expect(screen.getByText("Project Preview: Project Two")).toBeInTheDocument();
    });
  });

  describe("project states", () => {
    it("MAIN-007: should render ProjectPreview for pending project", () => {
      const pendingProject = { ...mockProject, status: "pending" as const };

      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: pendingProject };
        return selector(state as Parameters<typeof selector>[0]);
      });

      render(<MainContent />);

      expect(screen.getByTestId("project-preview")).toBeInTheDocument();
    });

    it("MAIN-008: should render ProjectPreview for generating project", () => {
      const generatingProject = { ...mockProject, status: "generating" as const };

      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: generatingProject };
        return selector(state as Parameters<typeof selector>[0]);
      });

      render(<MainContent />);

      expect(screen.getByTestId("project-preview")).toBeInTheDocument();
    });

    it("MAIN-009: should render ProjectPreview for failed project", () => {
      const failedProject = {
        ...mockProject,
        status: "failed" as const,
        errorMessage: "Generation failed",
      };

      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: failedProject };
        return selector(state as Parameters<typeof selector>[0]);
      });

      render(<MainContent />);

      expect(screen.getByTestId("project-preview")).toBeInTheDocument();
    });
  });
});

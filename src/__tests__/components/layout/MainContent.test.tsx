import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import userEvent from "@testing-library/user-event";
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

// Mock TodayView since it's not part of what we're testing
vi.mock("@/components/learning-path/TodayView", () => ({
  TodayView: () => <div data-testid="today-view">Today View</div>,
}));

// Mock LearningPathView
vi.mock("@/components/learning-path/LearningPathView", () => ({
  LearningPathView: () => <div data-testid="learning-path-view">Learning Path View</div>,
}));

// Mock LibraryView
vi.mock("@/components/library", () => ({
  LibraryView: () => <div data-testid="library-view">Library View</div>,
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
    // Default mock - no project selected
    vi.mocked(useProjectStore).mockImplementation((selector) => {
      const state = { currentProject: null } as unknown;
      return selector(state as never);
    });
  });

  describe("tab navigation", () => {
    it("should show Today tab by default", () => {
      render(<MainContent />);
      expect(screen.getByTestId("today-view")).toBeInTheDocument();
    });

    it("should switch to Learning Path tab when clicked", async () => {
      const user = userEvent.setup();
      render(<MainContent />);

      await user.click(screen.getByRole("tab", { name: /learning path/i }));

      expect(screen.getByTestId("learning-path-view")).toBeInTheDocument();
    });

    it("should switch to Library tab when clicked", async () => {
      const user = userEvent.setup();
      render(<MainContent />);

      await user.click(screen.getByRole("tab", { name: /library/i }));

      expect(screen.getByTestId("library-view")).toBeInTheDocument();
    });

    it("should switch to Projects tab when clicked", async () => {
      const user = userEvent.setup();
      render(<MainContent />);

      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("welcome-screen")).toBeInTheDocument();
    });
  });

  describe("projects tab - routing logic", () => {
    it("MAIN-001: should render WelcomeScreen when no project is selected", async () => {
      const user = userEvent.setup();
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: null } as unknown;
        return selector(state as never);
      });

      render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("welcome-screen")).toBeInTheDocument();
      expect(screen.queryByTestId("project-preview")).not.toBeInTheDocument();
    });

    it("MAIN-002: should render ProjectPreview when a project is selected", async () => {
      const user = userEvent.setup();
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: mockProject } as unknown;
        return selector(state as never);
      });

      render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("project-preview")).toBeInTheDocument();
      expect(screen.queryByTestId("welcome-screen")).not.toBeInTheDocument();
    });

    it("MAIN-003: should pass project to ProjectPreview", async () => {
      const user = userEvent.setup();
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: mockProject } as unknown;
        return selector(state as never);
      });

      render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByText("Project Preview: Math Worksheet")).toBeInTheDocument();
    });
  });

  describe("projects tab - reactivity", () => {
    it("MAIN-004: should switch from WelcomeScreen to ProjectPreview when project is selected", async () => {
      const user = userEvent.setup();
      // Start with no project
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: null } as unknown;
        return selector(state as never);
      });

      const { rerender } = render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("welcome-screen")).toBeInTheDocument();

      // Select a project
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: mockProject } as unknown;
        return selector(state as never);
      });

      rerender(<MainContent />);

      expect(screen.getByTestId("project-preview")).toBeInTheDocument();
      expect(screen.queryByTestId("welcome-screen")).not.toBeInTheDocument();
    });

    it("MAIN-005: should switch from ProjectPreview to WelcomeScreen when project is deselected", async () => {
      const user = userEvent.setup();
      // Start with a project
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: mockProject } as unknown;
        return selector(state as never);
      });

      const { rerender } = render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("project-preview")).toBeInTheDocument();

      // Deselect project
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: null } as unknown;
        return selector(state as never);
      });

      rerender(<MainContent />);

      expect(screen.getByTestId("welcome-screen")).toBeInTheDocument();
      expect(screen.queryByTestId("project-preview")).not.toBeInTheDocument();
    });

    it("MAIN-006: should update ProjectPreview when different project is selected", async () => {
      const user = userEvent.setup();
      const project1 = { ...mockProject, id: "project-1", title: "Project One" };
      const project2 = { ...mockProject, id: "project-2", title: "Project Two" };

      // Start with project 1
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: project1 } as unknown;
        return selector(state as never);
      });

      const { rerender } = render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByText("Project Preview: Project One")).toBeInTheDocument();

      // Switch to project 2
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: project2 } as unknown;
        return selector(state as never);
      });

      rerender(<MainContent />);

      expect(screen.getByText("Project Preview: Project Two")).toBeInTheDocument();
    });
  });

  describe("projects tab - project states", () => {
    it("MAIN-007: should render ProjectPreview for pending project", async () => {
      const user = userEvent.setup();
      const pendingProject = { ...mockProject, status: "pending" as const };

      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: pendingProject } as unknown;
        return selector(state as never);
      });

      render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("project-preview")).toBeInTheDocument();
    });

    it("MAIN-008: should render ProjectPreview for generating project", async () => {
      const user = userEvent.setup();
      const generatingProject = { ...mockProject, status: "generating" as const };

      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: generatingProject } as unknown;
        return selector(state as never);
      });

      render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("project-preview")).toBeInTheDocument();
    });

    it("MAIN-009: should render ProjectPreview for failed project", async () => {
      const user = userEvent.setup();
      const failedProject = {
        ...mockProject,
        status: "failed" as const,
        errorMessage: "Generation failed",
      };

      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { currentProject: failedProject } as unknown;
        return selector(state as never);
      });

      render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("project-preview")).toBeInTheDocument();
    });
  });
});

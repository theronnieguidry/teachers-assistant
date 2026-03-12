import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import userEvent from "@testing-library/user-event";
import { MainContent } from "@/components/layout/MainContent";
import { useProjectCatalog } from "@/hooks/useProjectCatalog";

vi.mock("@/hooks/useProjectCatalog", () => ({
  useProjectCatalog: vi.fn(),
}));

// Mock child components
vi.mock("@/components/layout/WelcomeScreen", () => ({
  WelcomeScreen: () => <div data-testid="welcome-screen">Welcome Screen</div>,
}));

vi.mock("@/components/projects/ProjectHomeView", () => ({
  ProjectHomeView: ({ project }: { project: { title: string } }) => (
    <div data-testid="project-home">Project Home: {project.title}</div>
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
    vi.mocked(useProjectCatalog).mockReturnValue({
      projects: [],
      currentProject: null,
      getProjectById: vi.fn(),
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
      vi.mocked(useProjectCatalog).mockReturnValue({
        projects: [],
        currentProject: null,
        getProjectById: vi.fn(),
      });

      render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("welcome-screen")).toBeInTheDocument();
      expect(screen.queryByTestId("project-home")).not.toBeInTheDocument();
    });

    it("MAIN-002: should render ProjectHomeView when a project is selected", async () => {
      const user = userEvent.setup();
      vi.mocked(useProjectCatalog).mockReturnValue({
        projects: [mockProject as never],
        currentProject: mockProject as never,
        getProjectById: vi.fn(),
      });

      render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("project-home")).toBeInTheDocument();
      expect(screen.queryByTestId("welcome-screen")).not.toBeInTheDocument();
    });

    it("MAIN-003: should pass project to ProjectHomeView", async () => {
      const user = userEvent.setup();
      vi.mocked(useProjectCatalog).mockReturnValue({
        projects: [mockProject as never],
        currentProject: mockProject as never,
        getProjectById: vi.fn(),
      });

      render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByText("Project Home: Math Worksheet")).toBeInTheDocument();
    });
  });

  describe("projects tab - reactivity", () => {
    it("MAIN-004: should switch from WelcomeScreen to ProjectPreview when project is selected", async () => {
      const user = userEvent.setup();
      // Start with no project
      vi.mocked(useProjectCatalog).mockReturnValue({
        projects: [],
        currentProject: null,
        getProjectById: vi.fn(),
      });

      const { rerender } = render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("welcome-screen")).toBeInTheDocument();

      // Select a project
      vi.mocked(useProjectCatalog).mockReturnValue({
        projects: [mockProject as never],
        currentProject: mockProject as never,
        getProjectById: vi.fn(),
      });

      rerender(<MainContent />);

      expect(screen.getByTestId("project-home")).toBeInTheDocument();
      expect(screen.queryByTestId("welcome-screen")).not.toBeInTheDocument();
    });

    it("MAIN-005: should switch from ProjectPreview to WelcomeScreen when project is deselected", async () => {
      const user = userEvent.setup();
      // Start with a project
      vi.mocked(useProjectCatalog).mockReturnValue({
        projects: [mockProject as never],
        currentProject: mockProject as never,
        getProjectById: vi.fn(),
      });

      const { rerender } = render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("project-home")).toBeInTheDocument();

      // Deselect project
      vi.mocked(useProjectCatalog).mockReturnValue({
        projects: [],
        currentProject: null,
        getProjectById: vi.fn(),
      });

      rerender(<MainContent />);

      expect(screen.getByTestId("welcome-screen")).toBeInTheDocument();
      expect(screen.queryByTestId("project-home")).not.toBeInTheDocument();
    });

    it("MAIN-006: should update ProjectHomeView when different project is selected", async () => {
      const user = userEvent.setup();
      const project1 = { ...mockProject, id: "project-1", title: "Project One" };
      const project2 = { ...mockProject, id: "project-2", title: "Project Two" };

      // Start with project 1
      vi.mocked(useProjectCatalog).mockReturnValue({
        projects: [project1 as never],
        currentProject: project1 as never,
        getProjectById: vi.fn(),
      });

      const { rerender } = render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByText("Project Home: Project One")).toBeInTheDocument();

      // Switch to project 2
      vi.mocked(useProjectCatalog).mockReturnValue({
        projects: [project2 as never],
        currentProject: project2 as never,
        getProjectById: vi.fn(),
      });

      rerender(<MainContent />);

      expect(screen.getByText("Project Home: Project Two")).toBeInTheDocument();
    });
  });

  describe("projects tab - project states", () => {
    it("MAIN-007: should render ProjectHomeView for pending project", async () => {
      const user = userEvent.setup();
      const pendingProject = { ...mockProject, status: "pending" as const };

      vi.mocked(useProjectCatalog).mockReturnValue({
        projects: [pendingProject as never],
        currentProject: pendingProject as never,
        getProjectById: vi.fn(),
      });

      render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("project-home")).toBeInTheDocument();
    });

    it("MAIN-008: should render ProjectHomeView for generating project", async () => {
      const user = userEvent.setup();
      const generatingProject = { ...mockProject, status: "generating" as const };

      vi.mocked(useProjectCatalog).mockReturnValue({
        projects: [generatingProject as never],
        currentProject: generatingProject as never,
        getProjectById: vi.fn(),
      });

      render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("project-home")).toBeInTheDocument();
    });

    it("MAIN-009: should render ProjectHomeView for failed project", async () => {
      const user = userEvent.setup();
      const failedProject = {
        ...mockProject,
        status: "failed" as const,
        errorMessage: "Generation failed",
      };

      vi.mocked(useProjectCatalog).mockReturnValue({
        projects: [failedProject as never],
        currentProject: failedProject as never,
        getProjectById: vi.fn(),
      });

      render(<MainContent />);
      await user.click(screen.getByRole("tab", { name: /projects/i }));

      expect(screen.getByTestId("project-home")).toBeInTheDocument();
    });
  });
});

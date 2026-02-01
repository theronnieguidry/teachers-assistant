import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectPreview } from "@/components/preview/ProjectPreview";
import { useProjectStore } from "@/stores/projectStore";
import type { Project } from "@/types";

// Mock PreviewTabs to simplify testing
vi.mock("@/components/preview/PreviewTabs", () => ({
  PreviewTabs: ({ projectTitle }: { projectTitle: string }) => (
    <div data-testid="preview-tabs">Preview Tabs for {projectTitle}</div>
  ),
}));

// Mock tauri-bridge
vi.mock("@/services/tauri-bridge", () => ({
  openFolder: vi.fn(),
}));

import { openFolder } from "@/services/tauri-bridge";

describe("ProjectPreview", () => {
  const mockFetchProjectVersion = vi.fn();
  const mockOnRegenerate = vi.fn();

  const createProject = (overrides: Partial<Project> = {}): Project => ({
    id: "project-123",
    userId: "user-123",
    title: "Math Worksheet",
    prompt: "Create a worksheet about addition",
    grade: "2",
    subject: "Math",
    options: {
      questionCount: 10,
      includeVisuals: true,
      difficulty: "medium",
      format: "worksheet",
      includeAnswerKey: true,
    },
    inspiration: [],
    status: "pending",
    creditsUsed: 0,
    outputPath: null,
    errorMessage: null,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    completedAt: null,
    latestVersion: undefined,
    description: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({
      fetchProjectVersion: mockFetchProjectVersion,
    });
    mockFetchProjectVersion.mockResolvedValue(undefined);
  });

  it("renders project title", () => {
    render(<ProjectPreview project={createProject()} />);

    expect(screen.getByText("Math Worksheet")).toBeInTheDocument();
  });

  it("renders grade and subject", () => {
    render(<ProjectPreview project={createProject()} />);

    expect(screen.getByText("Grade 2 • Math")).toBeInTheDocument();
  });

  it("renders original prompt", () => {
    render(<ProjectPreview project={createProject()} />);

    expect(screen.getByText("Original Prompt")).toBeInTheDocument();
    expect(screen.getByText("Create a worksheet about addition")).toBeInTheDocument();
  });

  it("shows Pending status badge", () => {
    render(<ProjectPreview project={createProject({ status: "pending" })} />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows Generating status badge", () => {
    render(<ProjectPreview project={createProject({ status: "generating" })} />);

    expect(screen.getByText("Generating...")).toBeInTheDocument();
  });

  it("shows Completed status badge", () => {
    render(<ProjectPreview project={createProject({ status: "completed" })} />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows Failed status badge", () => {
    render(<ProjectPreview project={createProject({ status: "failed" })} />);

    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("shows Start Generation button for pending projects", () => {
    render(
      <ProjectPreview
        project={createProject({ status: "pending" })}
        onRegenerate={mockOnRegenerate}
      />
    );

    expect(screen.getByRole("button", { name: /start generation/i })).toBeInTheDocument();
  });

  it("calls onRegenerate when Start Generation is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProjectPreview
        project={createProject({ status: "pending" })}
        onRegenerate={mockOnRegenerate}
      />
    );

    await user.click(screen.getByRole("button", { name: /start generation/i }));

    expect(mockOnRegenerate).toHaveBeenCalled();
  });

  it("shows generating message for in-progress projects", () => {
    render(<ProjectPreview project={createProject({ status: "generating" })} />);

    expect(screen.getByText(/your materials are being generated/i)).toBeInTheDocument();
  });

  it("shows error message for failed projects", () => {
    render(
      <ProjectPreview
        project={createProject({
          status: "failed",
          errorMessage: "API connection failed",
        })}
        onRegenerate={mockOnRegenerate}
      />
    );

    expect(screen.getByText("API connection failed")).toBeInTheDocument();
  });

  it("shows Retry Generation button for failed projects", () => {
    render(
      <ProjectPreview
        project={createProject({ status: "failed" })}
        onRegenerate={mockOnRegenerate}
      />
    );

    expect(screen.getByRole("button", { name: /retry generation/i })).toBeInTheDocument();
  });

  it("shows output cards for completed project with version", () => {
    render(
      <ProjectPreview
        project={createProject({
          status: "completed",
          latestVersion: {
            id: "version-1",
            projectId: "project-123",
            versionNumber: 1,
            worksheetHtml: "<html>Worksheet</html>",
            lessonPlanHtml: "<html>Lesson Plan</html>",
            answerKeyHtml: "<html>Answer Key</html>",
            teacherScriptHtml: null,
            studentActivityHtml: null,
            materialsListHtml: null,
            lessonMetadata: null,
            aiProvider: "claude",
            aiModel: null,
            createdAt: new Date(),
          },
        })}
      />
    );

    expect(screen.getByText("Worksheet")).toBeInTheDocument();
    expect(screen.getByText("Lesson Plan")).toBeInTheDocument();
    expect(screen.getByText("Answer Key")).toBeInTheDocument();
  });

  it("shows View & Print Materials button for completed projects", () => {
    render(
      <ProjectPreview
        project={createProject({
          status: "completed",
          latestVersion: {
            id: "version-1",
            projectId: "project-123",
            versionNumber: 1,
            worksheetHtml: "<html>Worksheet</html>",
            lessonPlanHtml: null,
            answerKeyHtml: null,
            teacherScriptHtml: null,
            studentActivityHtml: null,
            materialsListHtml: null,
            lessonMetadata: null,
            aiProvider: "claude",
            aiModel: null,
            createdAt: new Date(),
          },
        })}
      />
    );

    expect(screen.getByRole("button", { name: /view & print materials/i })).toBeInTheDocument();
  });

  it("shows Open Folder button when outputPath exists", () => {
    render(
      <ProjectPreview
        project={createProject({
          status: "completed",
          outputPath: "C:\\Output\\Project",
          latestVersion: {
            id: "version-1",
            projectId: "project-123",
            versionNumber: 1,
            worksheetHtml: "<html>Worksheet</html>",
            lessonPlanHtml: null,
            answerKeyHtml: null,
            teacherScriptHtml: null,
            studentActivityHtml: null,
            materialsListHtml: null,
            lessonMetadata: null,
            aiProvider: "claude",
            aiModel: null,
            createdAt: new Date(),
          },
        })}
      />
    );

    expect(screen.getByRole("button", { name: /open folder/i })).toBeInTheDocument();
  });

  it("calls openFolder when Open Folder is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProjectPreview
        project={createProject({
          status: "completed",
          outputPath: "C:\\Output\\Project",
          latestVersion: {
            id: "version-1",
            projectId: "project-123",
            versionNumber: 1,
            worksheetHtml: "<html>Worksheet</html>",
            lessonPlanHtml: null,
            answerKeyHtml: null,
            teacherScriptHtml: null,
            studentActivityHtml: null,
            materialsListHtml: null,
            lessonMetadata: null,
            aiProvider: "claude",
            aiModel: null,
            createdAt: new Date(),
          },
        })}
      />
    );

    await user.click(screen.getByRole("button", { name: /open folder/i }));

    expect(openFolder).toHaveBeenCalledWith("C:\\Output\\Project");
  });

  it("switches to preview mode when View & Print is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProjectPreview
        project={createProject({
          status: "completed",
          latestVersion: {
            id: "version-1",
            projectId: "project-123",
            versionNumber: 1,
            worksheetHtml: "<html>Worksheet</html>",
            lessonPlanHtml: null,
            answerKeyHtml: null,
            teacherScriptHtml: null,
            studentActivityHtml: null,
            materialsListHtml: null,
            lessonMetadata: null,
            aiProvider: "claude",
            aiModel: null,
            createdAt: new Date(),
          },
        })}
      />
    );

    await user.click(screen.getByRole("button", { name: /view & print materials/i }));

    expect(screen.getByTestId("preview-tabs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to details/i })).toBeInTheDocument();
  });

  it("displays created date", () => {
    render(<ProjectPreview project={createProject()} />);

    expect(screen.getByText(/created:/i)).toBeInTheDocument();
  });

  it("displays credits used when greater than 0", () => {
    render(
      <ProjectPreview
        project={createProject({ creditsUsed: 5 })}
      />
    );

    expect(screen.getByText("Credits used: 5")).toBeInTheDocument();
  });

  it("fetches version for completed project without version data", () => {
    render(
      <ProjectPreview
        project={createProject({ status: "completed", latestVersion: undefined })}
      />
    );

    expect(mockFetchProjectVersion).toHaveBeenCalledWith("project-123");
  });

  it("shows Generated indicator for available outputs", () => {
    render(
      <ProjectPreview
        project={createProject({
          status: "completed",
          latestVersion: {
            id: "version-1",
            projectId: "project-123",
            versionNumber: 1,
            worksheetHtml: "<html>Worksheet</html>",
            lessonPlanHtml: null,
            answerKeyHtml: null,
            teacherScriptHtml: null,
            studentActivityHtml: null,
            materialsListHtml: null,
            lessonMetadata: null,
            aiProvider: "claude",
            aiModel: null,
            createdAt: new Date(),
          },
        })}
      />
    );

    expect(screen.getByText("✓ Generated")).toBeInTheDocument();
    expect(screen.getAllByText("Not included")).toHaveLength(2);
  });
});

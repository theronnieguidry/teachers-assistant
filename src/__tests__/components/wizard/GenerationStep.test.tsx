import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerationStep } from "@/components/wizard/GenerationStep";
import { useWizardStore } from "@/stores/wizardStore";
import { useProjectStore } from "@/stores/projectStore";
import { useAuthStore } from "@/stores/authStore";

// Mock external services
vi.mock("@/services/generation-api", () => ({
  generateTeacherPack: vi.fn(),
  GenerationApiError: class GenerationApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

vi.mock("@/services/tauri-bridge", () => ({
  saveTeacherPack: vi.fn(),
}));

vi.mock("@/stores/toastStore", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { generateTeacherPack, GenerationApiError } from "@/services/generation-api";
import { saveTeacherPack } from "@/services/tauri-bridge";
import { toast } from "@/stores/toastStore";

describe("GenerationStep", () => {
  const mockCloseWizard = vi.fn();
  const mockReset = vi.fn();
  const mockSetGenerationState = vi.fn();
  const mockCreateProject = vi.fn();
  const mockUpdateProject = vi.fn();
  const mockUpdateProjectWithVersion = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useWizardStore.setState({
      isGenerating: false,
      generationProgress: 0,
      generationMessage: "",
      generationError: null,
      prompt: "Create a math worksheet",
      title: "Math Worksheet",
      classDetails: {
        grade: "2",
        subject: "Math",
        format: "worksheet",
        questionCount: 10,
        includeVisuals: true,
        difficulty: "medium",
        includeAnswerKey: true,
      },
      selectedInspiration: [],
      outputPath: "C:\\Output",
      closeWizard: mockCloseWizard,
      reset: mockReset,
      setGenerationState: mockSetGenerationState,
    });

    useProjectStore.setState({
      createProject: mockCreateProject,
      updateProject: mockUpdateProject,
      updateProjectWithVersion: mockUpdateProjectWithVersion,
    });

    useAuthStore.setState({
      session: { access_token: "test-token" } as any,
    });

    mockCreateProject.mockResolvedValue({ id: "project-123" });
    mockUpdateProject.mockResolvedValue({});
    mockUpdateProjectWithVersion.mockResolvedValue({});
    vi.mocked(generateTeacherPack).mockResolvedValue({
      worksheetHtml: "<html>Worksheet</html>",
      lessonPlanHtml: "<html>Lesson Plan</html>",
      answerKeyHtml: "<html>Answer Key</html>",
      creditsUsed: 3,
    });
    vi.mocked(saveTeacherPack).mockResolvedValue(undefined);
  });

  it("renders generating message initially", () => {
    useWizardStore.setState({
      isGenerating: true,
      generationMessage: "Creating project...",
    });

    render(<GenerationStep />);

    expect(screen.getByText("Generating Your Materials")).toBeInTheDocument();
  });

  it("displays progress bar", () => {
    useWizardStore.setState({
      isGenerating: true,
      generationProgress: 50,
    });

    render(<GenerationStep />);

    expect(screen.getByText("50% complete")).toBeInTheDocument();
  });

  it("displays generation message", () => {
    useWizardStore.setState({
      isGenerating: true,
      generationMessage: "Generating worksheet...",
    });

    render(<GenerationStep />);

    expect(screen.getByText("Generating worksheet...")).toBeInTheDocument();
  });

  it("shows success state when complete", () => {
    useWizardStore.setState({
      isGenerating: false,
      generationProgress: 100,
      generationMessage: "Complete!",
    });

    render(<GenerationStep />);

    expect(screen.getByText("Generation Complete!")).toBeInTheDocument();
    expect(screen.getByText("100% complete")).toBeInTheDocument();
  });

  it("shows Close and View Project buttons on success", () => {
    useWizardStore.setState({
      isGenerating: false,
      generationProgress: 100,
    });

    render(<GenerationStep />);

    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view project/i })).toBeInTheDocument();
  });

  it("shows error state when generation fails", () => {
    useWizardStore.setState({
      isGenerating: false,
      generationError: "Something went wrong",
    });

    render(<GenerationStep />);

    expect(screen.getByText("Generation Failed")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows Close and Retry buttons on error", () => {
    useWizardStore.setState({
      isGenerating: false,
      generationError: "Network error",
    });

    render(<GenerationStep />);

    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows insufficient credits message", () => {
    useWizardStore.setState({
      isGenerating: false,
      generationError: "Insufficient credits. Please purchase more credits to continue.",
    });

    render(<GenerationStep />);

    expect(
      screen.getByText(/you don't have enough credits/i)
    ).toBeInTheDocument();
  });

  it("does not show Retry button for insufficient credits", () => {
    useWizardStore.setState({
      isGenerating: false,
      generationError: "Insufficient credits. Please purchase more credits to continue.",
    });

    render(<GenerationStep />);

    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("calls reset and closeWizard when Close is clicked", async () => {
    const user = userEvent.setup();
    useWizardStore.setState({
      isGenerating: false,
      generationProgress: 100,
    });

    render(<GenerationStep />);

    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(mockReset).toHaveBeenCalled();
    expect(mockCloseWizard).toHaveBeenCalled();
  });

  it("shows success message with output path", () => {
    useWizardStore.setState({
      isGenerating: false,
      generationProgress: 100,
      outputPath: "C:\\Output",
    });

    render(<GenerationStep />);

    expect(
      screen.getByText(/files have been saved to your selected folder/i)
    ).toBeInTheDocument();
  });

  it("does not show action buttons while generating", () => {
    useWizardStore.setState({
      isGenerating: true,
      generationProgress: 50,
    });

    render(<GenerationStep />);

    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });
});

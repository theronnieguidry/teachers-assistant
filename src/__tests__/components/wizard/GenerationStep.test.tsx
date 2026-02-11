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

// Mock checkout-api (used by PurchaseDialog)
vi.mock("@/services/checkout-api", () => ({
  getCreditPacks: vi.fn().mockResolvedValue([]),
  createCheckoutSession: vi.fn(),
}));

// Mock useAuth hook for PurchaseDialog
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    session: { access_token: "test-token" },
    credits: { balance: 50, lifetimeGranted: 100, lifetimeUsed: 50 },
    refreshCredits: vi.fn(),
  }),
}));

// Mock the toast store - need both useToastStore and toast for PurchaseDialog
vi.mock("@/stores/toastStore", () => {
  const mockAddToast = vi.fn();
  const useToastStore = vi.fn(() => ({
    addToast: mockAddToast,
    toasts: [],
    removeToast: vi.fn(),
    clearToasts: vi.fn(),
  }));
  useToastStore.getState = () => ({
    addToast: mockAddToast,
    toasts: [],
    removeToast: vi.fn(),
    clearToasts: vi.fn(),
  });
  return {
    useToastStore,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  };
});

vi.mock("@/stores/inspirationStore", () => ({
  useInspirationStore: () => ({
    persistLocalItems: vi.fn().mockResolvedValue(new Map()),
  }),
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
        lessonLength: 30,
        studentProfile: [],
        teachingConfidence: "intermediate",
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
      projectId: "project-123",
      versionId: "version-123",
      worksheetHtml: "<html>Worksheet</html>",
      lessonPlanHtml: "<html>Lesson Plan</html>",
      answerKeyHtml: "<html>Answer Key</html>",
      creditsUsed: 3,
    });
    vi.mocked(saveTeacherPack).mockResolvedValue([]);
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

  it("does not send aiModel when using Local AI", async () => {
    useWizardStore.setState({
      aiProvider: "local",
    });

    render(<GenerationStep />);

    await waitFor(() => {
      expect(generateTeacherPack).toHaveBeenCalled();
    }, { timeout: 5000 });

    const request = vi.mocked(generateTeacherPack).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(request.aiProvider).toBe("local");
    expect(Object.prototype.hasOwnProperty.call(request, "aiModel")).toBe(false);
  });

  describe("store synchronization after generation", () => {
    const mockFetchProjectVersion = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();

      mockFetchProjectVersion.mockResolvedValue({
        id: "version-123",
        worksheetHtml: "<html>Worksheet</html>",
        lessonPlanHtml: "<html>Lesson Plan</html>",
        answerKeyHtml: "<html>Answer Key</html>",
      });

      // Reset mocks
      mockCreateProject.mockResolvedValue({ id: "project-123" });
      mockUpdateProject.mockResolvedValue({});
      vi.mocked(generateTeacherPack).mockResolvedValue({
        projectId: "project-123",
        versionId: "version-123",
        worksheetHtml: "<html>Worksheet</html>",
        lessonPlanHtml: "<html>Lesson Plan</html>",
        answerKeyHtml: "<html>Answer Key</html>",
        creditsUsed: 3,
      });
      vi.mocked(saveTeacherPack).mockResolvedValue([]);

      // Re-setup with fetchProjectVersion mock
      useProjectStore.setState({
        createProject: mockCreateProject,
        updateProject: mockUpdateProject,
        updateProjectWithVersion: mockUpdateProjectWithVersion,
        fetchProjectVersion: mockFetchProjectVersion,
      });
    });

    it("should call updateProject with completed status after successful generation", async () => {
      // Component will auto-start generation on mount when conditions are met
      render(<GenerationStep />);

      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledWith(
          "project-123",
          expect.objectContaining({
            status: "completed",
            creditsUsed: 3,
          })
        );
      }, { timeout: 5000 });
    });

    it("should call fetchProjectVersion after successful generation", async () => {
      render(<GenerationStep />);

      await waitFor(() => {
        expect(mockFetchProjectVersion).toHaveBeenCalledWith("project-123");
      }, { timeout: 5000 });
    });

    it("should call fetchProjectVersion after updateProject", async () => {
      // Track call order
      const callOrder: string[] = [];
      mockUpdateProject.mockImplementation(async (id, data) => {
        if (data.status === "completed") {
          callOrder.push("updateProject-completed");
        }
      });
      mockFetchProjectVersion.mockImplementation(async () => {
        callOrder.push("fetchProjectVersion");
        return { id: "version-123" };
      });

      render(<GenerationStep />);

      await waitFor(() => {
        expect(callOrder).toContain("updateProject-completed");
        expect(callOrder).toContain("fetchProjectVersion");
        // fetchProjectVersion should be called after updateProject with completed status
        const updateIndex = callOrder.indexOf("updateProject-completed");
        const fetchIndex = callOrder.indexOf("fetchProjectVersion");
        expect(fetchIndex).toBeGreaterThan(updateIndex);
      }, { timeout: 5000 });
    });

    it("should not call updateProject with completed status if generation fails", async () => {
      vi.mocked(generateTeacherPack).mockRejectedValue(new Error("AI error"));

      render(<GenerationStep />);

      await waitFor(() => {
        expect(mockSetGenerationState).toHaveBeenCalledWith(
          expect.objectContaining({
            error: "AI error",
          })
        );
      }, { timeout: 5000 });

      // updateProject should be called with status "failed", not "completed"
      expect(mockUpdateProject).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: "completed" })
      );
    });

    it("should not call fetchProjectVersion if generation fails", async () => {
      vi.mocked(generateTeacherPack).mockRejectedValue(new Error("AI error"));

      render(<GenerationStep />);

      await waitFor(() => {
        expect(mockSetGenerationState).toHaveBeenCalledWith(
          expect.objectContaining({
            error: "AI error",
          })
        );
      }, { timeout: 5000 });

      expect(mockFetchProjectVersion).not.toHaveBeenCalled();
    });
  });
});

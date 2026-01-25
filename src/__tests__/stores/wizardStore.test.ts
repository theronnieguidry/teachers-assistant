import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWizardStore, getProjectOptions } from "@/stores/wizardStore";
import { useProjectStore } from "@/stores/projectStore";

// Mock projectStore
vi.mock("@/stores/projectStore", () => ({
  useProjectStore: {
    getState: vi.fn(() => ({
      fetchProjectInspiration: vi.fn().mockResolvedValue([]),
    })),
  },
}));

describe("wizardStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useWizardStore.getState().reset();
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = useWizardStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.currentStep).toBe(1);
      expect(state.prompt).toBe("");
      expect(state.title).toBe("");
      expect(state.classDetails).toBeNull();
      expect(state.selectedInspiration).toEqual([]);
      expect(state.outputPath).toBeNull();
      expect(state.isGenerating).toBe(false);
      expect(state.generationProgress).toBe(0);
      expect(state.generationMessage).toBe("");
      expect(state.generationError).toBeNull();
    });
  });

  describe("openWizard", () => {
    it("should open wizard with prompt and generated title", () => {
      const { openWizard } = useWizardStore.getState();

      openWizard("Create a math worksheet for grade 2");

      const state = useWizardStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.currentStep).toBe(1);
      expect(state.prompt).toBe("Create a math worksheet for grade 2");
      expect(state.title).toBe("Create a math worksheet for grade 2");
    });

    it("should truncate long prompts for title", () => {
      const { openWizard } = useWizardStore.getState();
      const longPrompt = "A".repeat(100);

      openWizard(longPrompt);

      const state = useWizardStore.getState();
      expect(state.title).toBe("A".repeat(50) + "...");
      expect(state.prompt).toBe(longPrompt);
    });

    it("should initialize with default class details", () => {
      const { openWizard } = useWizardStore.getState();

      openWizard("Test prompt");

      const state = useWizardStore.getState();
      expect(state.classDetails).toEqual({
        grade: "2",
        subject: "",
        format: "both",
        questionCount: 10,
        includeVisuals: true,
        difficulty: "medium",
        includeAnswerKey: true,
      });
    });

    it("should reset generation state when opening", () => {
      useWizardStore.setState({
        isGenerating: true,
        generationProgress: 50,
        generationMessage: "Generating...",
        generationError: "Error",
      });

      const { openWizard } = useWizardStore.getState();
      openWizard("New prompt");

      const state = useWizardStore.getState();
      expect(state.isGenerating).toBe(false);
      expect(state.generationProgress).toBe(0);
      expect(state.generationMessage).toBe("");
      expect(state.generationError).toBeNull();
    });
  });

  describe("closeWizard", () => {
    it("should set isOpen to false", () => {
      useWizardStore.setState({ isOpen: true });
      const { closeWizard } = useWizardStore.getState();

      closeWizard();

      expect(useWizardStore.getState().isOpen).toBe(false);
    });
  });

  describe("step navigation", () => {
    describe("setStep", () => {
      it("should set current step directly", () => {
        const { setStep } = useWizardStore.getState();

        setStep(3);

        expect(useWizardStore.getState().currentStep).toBe(3);
      });
    });

    describe("nextStep", () => {
      it("should increment step", () => {
        useWizardStore.setState({ currentStep: 1 });
        const { nextStep } = useWizardStore.getState();

        nextStep();

        expect(useWizardStore.getState().currentStep).toBe(2);
      });

      it("should not go beyond step 6", () => {
        useWizardStore.setState({ currentStep: 6 });
        const { nextStep } = useWizardStore.getState();

        nextStep();

        expect(useWizardStore.getState().currentStep).toBe(6);
      });
    });

    describe("prevStep", () => {
      it("should decrement step", () => {
        useWizardStore.setState({ currentStep: 3 });
        const { prevStep } = useWizardStore.getState();

        prevStep();

        expect(useWizardStore.getState().currentStep).toBe(2);
      });

      it("should not go below step 1", () => {
        useWizardStore.setState({ currentStep: 1 });
        const { prevStep } = useWizardStore.getState();

        prevStep();

        expect(useWizardStore.getState().currentStep).toBe(1);
      });
    });
  });

  describe("setPrompt", () => {
    it("should update prompt", () => {
      const { setPrompt } = useWizardStore.getState();

      setPrompt("New prompt");

      expect(useWizardStore.getState().prompt).toBe("New prompt");
    });
  });

  describe("setTitle", () => {
    it("should update title", () => {
      const { setTitle } = useWizardStore.getState();

      setTitle("Custom Title");

      expect(useWizardStore.getState().title).toBe("Custom Title");
    });
  });

  describe("setClassDetails", () => {
    it("should update class details", () => {
      const { setClassDetails } = useWizardStore.getState();
      const details = {
        grade: "3" as const,
        subject: "Science",
        format: "worksheet" as const,
        questionCount: 15,
        includeVisuals: false,
        difficulty: "hard" as const,
        includeAnswerKey: false,
      };

      setClassDetails(details);

      expect(useWizardStore.getState().classDetails).toEqual(details);
    });
  });

  describe("setSelectedInspiration", () => {
    it("should update selected inspiration", () => {
      const { setSelectedInspiration } = useWizardStore.getState();
      const items = [
        { id: "1", type: "url" as const, title: "Test" },
        { id: "2", type: "pdf" as const, title: "Test PDF" },
      ];

      setSelectedInspiration(items);

      expect(useWizardStore.getState().selectedInspiration).toEqual(items);
    });
  });

  describe("setOutputPath", () => {
    it("should update output path", () => {
      const { setOutputPath } = useWizardStore.getState();

      setOutputPath("/path/to/output");

      expect(useWizardStore.getState().outputPath).toBe("/path/to/output");
    });
  });

  describe("setGenerationState", () => {
    it("should update generation state partially", () => {
      const { setGenerationState } = useWizardStore.getState();

      setGenerationState({ isGenerating: true, progress: 50 });

      const state = useWizardStore.getState();
      expect(state.isGenerating).toBe(true);
      expect(state.generationProgress).toBe(50);
      expect(state.generationMessage).toBe(""); // unchanged
    });

    it("should update message", () => {
      const { setGenerationState } = useWizardStore.getState();

      setGenerationState({ message: "Generating worksheet..." });

      expect(useWizardStore.getState().generationMessage).toBe("Generating worksheet...");
    });

    it("should update error", () => {
      const { setGenerationState } = useWizardStore.getState();

      setGenerationState({ error: "Generation failed" });

      expect(useWizardStore.getState().generationError).toBe("Generation failed");
    });

    it("should clear error when set to null", () => {
      useWizardStore.setState({ generationError: "Previous error" });
      const { setGenerationState } = useWizardStore.getState();

      setGenerationState({ error: null });

      expect(useWizardStore.getState().generationError).toBeNull();
    });
  });

  describe("reset", () => {
    it("should reset all state to initial values", () => {
      // Set some state
      useWizardStore.setState({
        isOpen: true,
        currentStep: 3,
        prompt: "Test",
        title: "Title",
        classDetails: {
          grade: "3",
          subject: "Math",
          format: "both",
          questionCount: 15,
          includeVisuals: true,
          difficulty: "hard",
          includeAnswerKey: true,
        },
        selectedInspiration: [{ id: "1", type: "url", title: "Test" }],
        outputPath: "/path",
        isGenerating: true,
        generationProgress: 50,
        generationMessage: "Working...",
        generationError: "Error",
      });

      const { reset } = useWizardStore.getState();
      reset();

      const state = useWizardStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.currentStep).toBe(1);
      expect(state.prompt).toBe("");
      expect(state.title).toBe("");
      expect(state.classDetails).toBeNull();
      expect(state.selectedInspiration).toEqual([]);
      expect(state.outputPath).toBeNull();
      expect(state.isGenerating).toBe(false);
      expect(state.generationProgress).toBe(0);
      expect(state.generationMessage).toBe("");
      expect(state.generationError).toBeNull();
    });
  });

  describe("getProjectOptions helper", () => {
    it("should return empty object when no class details", () => {
      const state = useWizardStore.getState();
      const options = getProjectOptions(state);
      expect(options).toEqual({});
    });

    it("should return options from class details", () => {
      useWizardStore.setState({
        classDetails: {
          grade: "2",
          subject: "Math",
          format: "worksheet",
          questionCount: 15,
          includeVisuals: false,
          difficulty: "easy",
          includeAnswerKey: true,
        },
      });

      const state = useWizardStore.getState();
      const options = getProjectOptions(state);

      expect(options).toEqual({
        questionCount: 15,
        includeVisuals: false,
        difficulty: "easy",
        format: "worksheet",
        includeAnswerKey: true,
      });
    });
  });

  describe("openWizardForRegeneration", () => {
    const mockProject = {
      id: "project-123",
      userId: "user-123",
      title: "Test Project",
      description: null,
      prompt: "Create a math worksheet about addition",
      grade: "3" as const,
      subject: "Math",
      options: {
        format: "worksheet",
        questionCount: 15,
        includeVisuals: false,
        difficulty: "hard",
        includeAnswerKey: true,
      },
      inspiration: [
        { id: "insp-1", type: "url" as const, title: "Reference" },
      ],
      outputPath: "/path/to/output",
      status: "completed" as const,
      errorMessage: null,
      creditsUsed: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date(),
    };

    beforeEach(() => {
      // Reset the mock for fetchProjectInspiration
      vi.mocked(useProjectStore.getState).mockReturnValue({
        fetchProjectInspiration: vi.fn().mockResolvedValue([]),
      } as never);
    });

    it("REGEN-001: should set regeneratingProjectId", async () => {
      const { openWizardForRegeneration } = useWizardStore.getState();

      await openWizardForRegeneration(mockProject);

      const state = useWizardStore.getState();
      expect(state.regeneratingProjectId).toBe("project-123");
    });

    it("REGEN-002: should pre-fill prompt from existing project", async () => {
      const { openWizardForRegeneration } = useWizardStore.getState();

      await openWizardForRegeneration(mockProject);

      const state = useWizardStore.getState();
      expect(state.prompt).toBe("Create a math worksheet about addition");
    });

    it("REGEN-003: should pre-fill classDetails from existing project", async () => {
      const { openWizardForRegeneration } = useWizardStore.getState();

      await openWizardForRegeneration(mockProject);

      const state = useWizardStore.getState();
      expect(state.classDetails).toEqual({
        grade: "3",
        subject: "Math",
        format: "worksheet",
        questionCount: 15,
        includeVisuals: false,
        difficulty: "hard",
        includeAnswerKey: true,
      });
    });

    it("REGEN-004: should pre-fill inspiration from existing project (JSONB fallback)", async () => {
      // Junction table returns empty, should fall back to JSONB
      vi.mocked(useProjectStore.getState).mockReturnValue({
        fetchProjectInspiration: vi.fn().mockResolvedValue([]),
      } as never);

      const { openWizardForRegeneration } = useWizardStore.getState();

      await openWizardForRegeneration(mockProject);

      const state = useWizardStore.getState();
      expect(state.selectedInspiration).toEqual([
        { id: "insp-1", type: "url", title: "Reference" },
      ]);
    });

    it("REGEN-005: should pre-fill outputPath from existing project", async () => {
      const { openWizardForRegeneration } = useWizardStore.getState();

      await openWizardForRegeneration(mockProject);

      const state = useWizardStore.getState();
      expect(state.outputPath).toBe("/path/to/output");
    });

    it("should pre-fill title from existing project", async () => {
      const { openWizardForRegeneration } = useWizardStore.getState();

      await openWizardForRegeneration(mockProject);

      const state = useWizardStore.getState();
      expect(state.title).toBe("Test Project");
    });

    it("should open wizard on step 1", async () => {
      const { openWizardForRegeneration } = useWizardStore.getState();

      await openWizardForRegeneration(mockProject);

      const state = useWizardStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.currentStep).toBe(1);
    });

    it("should reset generation state", async () => {
      useWizardStore.setState({
        isGenerating: true,
        generationProgress: 50,
        generationMessage: "Old message",
        generationError: "Old error",
      });

      const { openWizardForRegeneration } = useWizardStore.getState();
      await openWizardForRegeneration(mockProject);

      const state = useWizardStore.getState();
      expect(state.isGenerating).toBe(false);
      expect(state.generationProgress).toBe(0);
      expect(state.generationMessage).toBe("");
      expect(state.generationError).toBeNull();
    });

    it("should use defaults when project options are missing", async () => {
      const projectWithoutOptions = {
        ...mockProject,
        options: {},
        inspiration: undefined,
        outputPath: null,
      };

      const { openWizardForRegeneration } = useWizardStore.getState();
      await openWizardForRegeneration(projectWithoutOptions);

      const state = useWizardStore.getState();
      expect(state.classDetails).toEqual({
        grade: "3",
        subject: "Math",
        format: "both",
        questionCount: 10,
        includeVisuals: true,
        difficulty: "medium",
        includeAnswerKey: true,
      });
      expect(state.selectedInspiration).toEqual([]);
      expect(state.outputPath).toBeNull();
    });

    it("should load inspiration from junction table when available", async () => {
      const junctionInspiration = [
        { id: "junction-insp-1", type: "url" as const, title: "From Junction Table" },
        { id: "junction-insp-2", type: "pdf" as const, title: "PDF from Junction" },
      ];

      vi.mocked(useProjectStore.getState).mockReturnValue({
        fetchProjectInspiration: vi.fn().mockResolvedValue(junctionInspiration),
      } as never);

      const { openWizardForRegeneration } = useWizardStore.getState();
      await openWizardForRegeneration(mockProject);

      const state = useWizardStore.getState();
      // Should use junction table items, not JSONB fallback
      expect(state.selectedInspiration).toEqual(junctionInspiration);
    });

    it("should fallback to JSONB when junction table is empty", async () => {
      vi.mocked(useProjectStore.getState).mockReturnValue({
        fetchProjectInspiration: vi.fn().mockResolvedValue([]),
      } as never);

      const { openWizardForRegeneration } = useWizardStore.getState();
      await openWizardForRegeneration(mockProject);

      const state = useWizardStore.getState();
      // Should fallback to JSONB inspiration
      expect(state.selectedInspiration).toEqual([
        { id: "insp-1", type: "url", title: "Reference" },
      ]);
    });

    it("should call fetchProjectInspiration with correct project ID", async () => {
      const mockFetch = vi.fn().mockResolvedValue([]);
      vi.mocked(useProjectStore.getState).mockReturnValue({
        fetchProjectInspiration: mockFetch,
      } as never);

      const { openWizardForRegeneration } = useWizardStore.getState();
      await openWizardForRegeneration(mockProject);

      expect(mockFetch).toHaveBeenCalledWith("project-123");
    });
  });

  describe("regeneratingProjectId state", () => {
    it("REGEN-008: reset() should clear regeneratingProjectId", () => {
      useWizardStore.setState({ regeneratingProjectId: "project-123" });

      const { reset } = useWizardStore.getState();
      reset();

      expect(useWizardStore.getState().regeneratingProjectId).toBeNull();
    });

    it("REGEN-009: openWizard() should set regeneratingProjectId to null", () => {
      useWizardStore.setState({ regeneratingProjectId: "project-123" });

      const { openWizard } = useWizardStore.getState();
      openWizard("New prompt");

      expect(useWizardStore.getState().regeneratingProjectId).toBeNull();
    });
  });
});

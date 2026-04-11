import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { GenerationStep } from "@/components/wizard/GenerationStep";
import { generateTeacherPack } from "@/services/generation-api";

const mockSetGenerationState = vi.fn();
const mockCreateProject = vi.fn();
const mockUpdateProject = vi.fn().mockResolvedValue(undefined);
const mockSetCurrentProject = vi.fn();
const mockFetchProjectVersion = vi.fn().mockResolvedValue(null);
const mockSaveFromGeneration = vi.fn().mockResolvedValue(undefined);
const mockMarkProjectUsed = vi.fn();
const mockLinkObjective = vi.fn();
const mockSetDefaultDesignPack = vi.fn();
const mockSetSelectedInspirationIds = vi.fn();

const wizardState = {
  isGenerating: false,
  generationProgress: 0,
  generationMessage: "",
  generationError: null as string | null,
  setGenerationState: mockSetGenerationState,
  closeWizard: vi.fn(),
  reset: vi.fn(),
  prompt: "Create a worksheet",
  polishedPrompt: null as string | null,
  usePolishedPrompt: true,
  title: "Fractions Pack",
  objectiveId: null as string | null,
  learnerId: null as string | null,
  classDetails: {
    grade: "2" as const,
    subject: "Math",
    format: "worksheet" as const,
    questionCount: 10,
    includeVisuals: true,
    difficulty: "medium" as const,
    includeAnswerKey: true,
    lessonLength: 30 as const,
    studentProfile: [],
    teachingConfidence: "intermediate" as const,
  },
  remediationContext: null as null | {
    objectiveId: string;
    objectiveText: string;
    subject: string;
    grade: "2";
    score: number;
    wrongAnswerSummary: string;
    missedCheckpoints: Array<{ kind: "core"; prompt: string }>;
  },
  selectedInspirationIds: ["item-1"],
  getEffectiveInspiration: () => [
    { id: "item-1", type: "url" as const, title: "Reference Link" },
    { id: "pack-item-1", type: "pdf" as const, title: "Pack Notes", content: "base64" },
  ],
  outputPath: null as string | null,
  aiProvider: "local" as const,
  regeneratingProjectId: null as string | null,
  targetProjectId: null as string | null,
  generationMode: "standard" as "standard" | "remediation_pack",
  visualSettings: {
    includeVisuals: true,
    richness: "minimal" as const,
    style: "friendly_cartoon" as const,
  },
  prevStep: vi.fn(),
};

const projectStoreHookValue = {
  createProject: mockCreateProject,
  syncProjectDefinition: vi.fn(),
  updateProject: mockUpdateProject,
  setCurrentProject: mockSetCurrentProject,
};

vi.mock("@/stores/wizardStore", () => ({
  useWizardStore: vi.fn((selector?: (state: typeof wizardState) => unknown) =>
    selector ? selector(wizardState) : wizardState
  ),
}));

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: Object.assign(
    vi.fn(() => projectStoreHookValue),
    {
      getState: vi.fn(() => ({
        fetchProjectVersion: mockFetchProjectVersion,
        projects: [],
      })),
    }
  ),
}));

vi.mock("@/stores/projectContextStore", () => ({
  useProjectContextStore: {
    getState: vi.fn(() => ({
      getContext: () => null,
      markProjectUsed: mockMarkProjectUsed,
      linkObjective: mockLinkObjective,
      setDefaultDesignPack: mockSetDefaultDesignPack,
      setSelectedInspirationIds: mockSetSelectedInspirationIds,
    })),
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({ session: { access_token: "test-token" } }),
}));

vi.mock("@/stores/artifactStore", () => ({
  useArtifactStore: {
    getState: vi.fn(() => ({
      saveFromGeneration: mockSaveFromGeneration,
    })),
  },
}));

vi.mock("@/stores/designPackStore", () => ({
  useDesignPackStore: vi.fn((selector?: (state: { selectedPackId: string | null; getSelectedPack: () => { packId: string; name: string; items: Array<{ id: string; type: "url" | "pdf" | "image" | "text"; title: string }> } | null }) => unknown) =>
    selector
      ? selector({
          selectedPackId: "pack-1",
          getSelectedPack: () => ({
            packId: "pack-1",
            name: "Spring Pack",
            items: [{ id: "pack-item-1", type: "pdf", title: "Pack Notes" }],
          }),
        })
      : {
          selectedPackId: "pack-1",
          getSelectedPack: () => ({
            packId: "pack-1",
            name: "Spring Pack",
            items: [{ id: "pack-item-1", type: "pdf", title: "Pack Notes" }],
          }),
        }
  ),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ credits: { balance: 10 } }),
}));

vi.mock("@/services/generation-api", () => ({
  generateTeacherPack: vi.fn(),
  estimateCredits: vi.fn(),
  GenerationApiError: class extends Error {},
}));

vi.mock("@/services/tauri-bridge", () => ({
  saveTeacherPack: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/stores/toastStore", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/purchase", () => ({
  PurchaseDialog: () => null,
}));

vi.mock("@/components/wizard/CreditEstimate", () => ({
  CreditEstimate: () => null,
}));

describe("GenerationStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wizardState.generationMode = "standard";
    wizardState.remediationContext = null;
    mockCreateProject.mockResolvedValue({ id: "project-123" });
    vi.mocked(generateTeacherPack).mockResolvedValue({
      projectId: "project-123",
      versionId: "version-1",
      worksheetHtml: "<p>Worksheet</p>",
      lessonPlanHtml: "",
      answerKeyHtml: "<p>Answers</p>",
      creditsUsed: 0,
    });
  });

  it("sends flattened inspiration only and persists selected inspiration ids in context", async () => {
    render(<GenerationStep />);

    await waitFor(() => {
      expect(generateTeacherPack).toHaveBeenCalled();
    });

    const request = vi.mocked(generateTeacherPack).mock.calls[0]?.[0];
    expect(request).toEqual(
      expect.objectContaining({
        inspiration: [
          expect.objectContaining({ id: "item-1", title: "Reference Link" }),
          expect.objectContaining({ id: "pack-item-1", title: "Pack Notes" }),
        ],
      })
    );
    expect(request?.designPackContext).toBeUndefined();
    expect(mockSetDefaultDesignPack).toHaveBeenCalledWith("project-123", "pack-1");
    expect(mockSetSelectedInspirationIds).toHaveBeenCalledWith("project-123", ["item-1"]);
  });

  it("includes remediation context when generating a remediation pack", async () => {
    wizardState.generationMode = "remediation_pack";
    wizardState.remediationContext = {
      objectiveId: "math-2-1",
      objectiveText: "Add within 20",
      subject: "Math",
      grade: "2",
      score: 33,
      wrongAnswerSummary: "Needs support with regrouping.",
      missedCheckpoints: [{ kind: "core", prompt: "Can the learner add within 20?" }],
    };

    render(<GenerationStep />);

    await waitFor(() => {
      expect(generateTeacherPack).toHaveBeenCalled();
    });

    const request = vi.mocked(generateTeacherPack).mock.calls[0]?.[0];
    expect(request).toEqual(
      expect.objectContaining({
        generationMode: "remediation_pack",
        remediationContext: expect.objectContaining({
          objectiveId: "math-2-1",
          score: 33,
        }),
      })
    );

    wizardState.generationMode = "standard";
    wizardState.remediationContext = null;
  });
});

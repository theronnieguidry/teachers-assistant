import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PromptReviewStep } from "@/components/wizard/PromptReviewStep";
import { polishPrompt } from "@/services/generation-api";

const mockSetPolishedPrompt = vi.fn();
const mockSetUsePolishedPrompt = vi.fn();
const mockNextStep = vi.fn();
const mockPrevStep = vi.fn();

const wizardState = {
  prompt: "Create a math worksheet about fractions",
  classDetails: {
    grade: "3" as const,
    subject: "Math",
    format: "worksheet" as const,
    questionCount: 10,
    difficulty: "medium" as const,
    includeVisuals: true,
    includeAnswerKey: true,
    lessonLength: 30 as const,
    studentProfile: [],
    teachingConfidence: "intermediate" as const,
  },
  getEffectiveInspiration: () => [
    { id: "item-1", type: "url" as const, title: "Math Article" },
    { id: "item-2", type: "pdf" as const, title: "PDF Resource" },
  ],
  polishedPrompt: null as string | null,
  setPolishedPrompt: mockSetPolishedPrompt,
  setUsePolishedPrompt: mockSetUsePolishedPrompt,
  nextStep: mockNextStep,
  prevStep: mockPrevStep,
};

const designPackStoreState = {
  getSelectedPack: () => null,
};

vi.mock("@/services/generation-api", () => ({
  polishPrompt: vi.fn(),
}));

vi.mock("@/stores/wizardStore", () => ({
  useWizardStore: vi.fn((selector?: (state: typeof wizardState) => unknown) =>
    selector ? selector(wizardState) : wizardState
  ),
}));

vi.mock("@/stores/designPackStore", () => ({
  useDesignPackStore: vi.fn((selector?: (state: typeof designPackStoreState) => unknown) =>
    selector ? selector(designPackStoreState) : designPackStoreState
  ),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(() => ({ session: { access_token: "test-token" } })),
}));

vi.mock("@/components/wizard/K6SoftLimitAlert", () => ({
  K6SoftLimitAlert: () => null,
}));

describe("PromptReviewStep", () => {
  beforeEach(() => {
    wizardState.polishedPrompt = null;
    designPackStoreState.getSelectedPack = () => null;
    vi.clearAllMocks();
    vi.mocked(polishPrompt).mockResolvedValue({
      original: wizardState.prompt,
      polished: "Polished prompt",
      wasPolished: true,
    });
  });

  it("calls prompt polishing with the effective inspiration titles", async () => {
    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(polishPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Create a math worksheet about fractions",
          inspirationTitles: ["Math Article", "PDF Resource"],
        }),
        "test-token"
      );
    });
  });

  it("renders the selected pack summary using local-first wording", async () => {
    designPackStoreState.getSelectedPack = () => ({
      packId: "pack-1",
      name: "Spring Pack",
      items: [{ id: "pack-item-1", type: "url", title: "Color Reference" }],
      createdAt: "2026-04-10T10:00:00.000Z",
      updatedAt: "2026-04-10T10:00:00.000Z",
    });

    render(<PromptReviewStep />);

    expect(await screen.findByText("Selected Pack: Spring Pack")).toBeInTheDocument();
  });
});

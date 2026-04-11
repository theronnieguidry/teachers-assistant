import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AIProviderStep } from "@/components/wizard/AIProviderStep";

const wizardState = {
  aiProvider: "local" as const,
  setAiProvider: vi.fn(),
  visualSettings: {
    includeVisuals: true,
    richness: "minimal" as const,
    style: "friendly_cartoon" as const,
  },
  setVisualSettings: vi.fn(),
  classDetails: {
    grade: "2" as const,
  },
  getEffectiveInspiration: () => [],
  nextStep: vi.fn(),
  prevStep: vi.fn(),
};

vi.mock("@/stores/wizardStore", () => ({
  useWizardStore: vi.fn((selector?: (state: typeof wizardState) => unknown) =>
    selector ? selector(wizardState) : wizardState
  ),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ credits: { balance: 10 } }),
}));

vi.mock("@/stores/settingsStore", () => ({
  isHostedApiBaseUrl: () => true,
  useSettingsStore: vi.fn((selector?: (state: { getResolvedApiUrl?: never; getResolvedApiBaseUrl: () => string; allowPremiumOnLocalDev: boolean }) => unknown) =>
    selector
      ? selector({
          getResolvedApiBaseUrl: () => "https://api.example.com",
          allowPremiumOnLocalDev: false,
        })
      : {
          getResolvedApiBaseUrl: () => "https://api.example.com",
          allowPremiumOnLocalDev: false,
        }
  ),
}));

vi.mock("@/components/wizard/ProviderSelector", () => ({
  ProviderSelector: () => <div>Provider Selector</div>,
}));

vi.mock("@/components/wizard/VisualOptionsPanel", () => ({
  VisualOptionsPanel: () => <div>Visual Options</div>,
}));

vi.mock("@/components/purchase", () => ({
  PurchaseDialog: () => null,
}));

vi.mock("@/components/wizard/K6SoftLimitAlert", () => ({
  K6SoftLimitAlert: () => null,
}));

describe("AIProviderStep", () => {
  beforeEach(() => {
    wizardState.aiProvider = "local";
    wizardState.getEffectiveInspiration = () => [];
    vi.clearAllMocks();
  });

  it("warns when local AI is used with visual inspiration", () => {
    wizardState.getEffectiveInspiration = () => [
      { id: "img-1", type: "image", title: "Mood Board" },
    ];

    render(<AIProviderStep />);

    expect(screen.getByText(/Design inspiration will be limited/i)).toBeInTheDocument();
  });

  it("shows visual options only for premium AI", () => {
    wizardState.aiProvider = "premium";

    render(<AIProviderStep />);

    expect(screen.getAllByText("Visual Options")).toHaveLength(2);
  });
});

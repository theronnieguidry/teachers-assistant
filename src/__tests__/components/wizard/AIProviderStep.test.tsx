import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AIProviderStep } from "@/components/wizard/AIProviderStep";
import { useWizardStore } from "@/stores/wizardStore";
import { useSettingsStore } from "@/stores/settingsStore";

let mockCreditsBalance = 50;

vi.mock("@/components/wizard/ProviderSelector", () => ({
  ProviderSelector: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div data-testid="provider-selector">
      <select
        data-testid="provider-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="premium">Premium AI</option>
        <option value="local">Local AI</option>
      </select>
    </div>
  ),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    credits: { balance: mockCreditsBalance, lifetimeGranted: 50, lifetimeUsed: 0 },
    refreshCredits: vi.fn(),
  }),
}));

vi.mock("@/components/purchase", () => ({
  PurchaseDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="purchase-dialog">Purchase Dialog</div> : null,
}));

describe("AIProviderStep", () => {
  const mockNextStep = vi.fn();
  const mockPrevStep = vi.fn();
  const mockSetAiProvider = vi.fn();
  const mockSetVisualSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreditsBalance = 50;
    useSettingsStore.setState({
      defaultAiProvider: "local",
      apiEndpointPreset: "local",
      customApiEndpoint: "",
      allowPremiumOnLocalDev: true,
    });

    useWizardStore.setState({
      aiProvider: "premium",
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      setAiProvider: mockSetAiProvider,
      visualSettings: {
        includeVisuals: true,
        richness: "minimal",
        style: "friendly_cartoon",
      },
      setVisualSettings: mockSetVisualSettings,
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
    });
  });

  it("renders provider selector and controls", () => {
    render(<AIProviderStep />);

    expect(screen.getByTestId("provider-selector")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("shows Premium AI as default provider", () => {
    render(<AIProviderStep />);
    expect(screen.getByTestId("provider-select")).toHaveValue("premium");
  });

  it("calls setAiProvider when provider is changed", async () => {
    const user = userEvent.setup();
    render(<AIProviderStep />);

    await user.selectOptions(screen.getByTestId("provider-select"), "local");
    expect(mockSetAiProvider).toHaveBeenCalledWith("local");
  });

  it("allows continuing with Local AI without model selection", () => {
    useWizardStore.setState({ aiProvider: "local" });
    render(<AIProviderStep />);

    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
  });

  it("blocks Premium AI when credits are insufficient", () => {
    mockCreditsBalance = 0;
    render(<AIProviderStep />);

    expect(
      screen.getByText(/Insufficient credits for Premium AI/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("shows local design warning when visual inspiration exists", () => {
    useWizardStore.setState({
      aiProvider: "local",
      selectedInspiration: [
        { id: "img-1", type: "image", title: "design.png", content: "base64" },
      ],
    });

    render(<AIProviderStep />);

    expect(screen.getByText(/Design inspiration will be limited/i)).toBeInTheDocument();
  });

  it("shows K-6 soft-limit warning for grade 4-6 regardless of provider", () => {
    useWizardStore.setState({
      aiProvider: "local",
      classDetails: {
        grade: "5",
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
    });

    render(<AIProviderStep />);

    expect(screen.getByText(/K-3 is still the strongest fit/i)).toBeInTheDocument();
  });

  it("calls prevStep and nextStep from buttons", async () => {
    const user = userEvent.setup();
    render(<AIProviderStep />);

    await user.click(screen.getByRole("button", { name: /back/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(mockPrevStep).toHaveBeenCalledTimes(1);
    expect(mockNextStep).toHaveBeenCalledTimes(1);
  });

  it("blocks Premium AI on local endpoint when override is disabled", () => {
    useSettingsStore.setState({ allowPremiumOnLocalDev: false });
    render(<AIProviderStep />);

    expect(
      screen.getByText(/Premium AI is disabled on this endpoint/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });
});

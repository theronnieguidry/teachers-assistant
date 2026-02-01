import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AIProviderStep } from "@/components/wizard/AIProviderStep";
import { useWizardStore } from "@/stores/wizardStore";

// Mock the ProviderSelector component to avoid complex Ollama API mocking
vi.mock("@/components/wizard/ProviderSelector", () => ({
  ProviderSelector: ({
    value,
    onChange,
    ollamaModel,
    onOllamaModelChange,
  }: {
    value: string;
    onChange: (value: string) => void;
    ollamaModel: string | null;
    onOllamaModelChange: (value: string | null) => void;
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
      {value === "local" && (
        <select
          data-testid="model-select"
          value={ollamaModel || ""}
          onChange={(e) => onOllamaModelChange(e.target.value || null)}
        >
          <option value="">Select a model</option>
          <option value="llama3.2">llama3.2</option>
          <option value="mistral">mistral</option>
        </select>
      )}
    </div>
  ),
}));

// Mock useAuth hook
const mockRefreshCredits = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    credits: { balance: 50, lifetimeGranted: 50, lifetimeUsed: 0 },
    refreshCredits: mockRefreshCredits,
  }),
}));

// Mock PurchaseDialog to avoid complex component testing
vi.mock("@/components/purchase", () => ({
  PurchaseDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="purchase-dialog">Purchase Dialog</div> : null,
}));

describe("AIProviderStep", () => {
  const mockNextStep = vi.fn();
  const mockPrevStep = vi.fn();
  const mockSetAiProvider = vi.fn();
  const mockSetOllamaModel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useWizardStore.setState({
      aiProvider: "premium",
      ollamaModel: null,
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      setAiProvider: mockSetAiProvider,
      setOllamaModel: mockSetOllamaModel,
      selectedInspiration: [],
    });
  });

  it("renders the AI provider selector", () => {
    render(<AIProviderStep />);

    expect(screen.getByTestId("provider-selector")).toBeInTheDocument();
    expect(screen.getByText(/AI Provider/i)).toBeInTheDocument();
  });

  it("renders the description text", () => {
    render(<AIProviderStep />);

    expect(
      screen.getByText(/Choose which AI will generate your teaching materials/i)
    ).toBeInTheDocument();
  });

  it("renders Back button", () => {
    render(<AIProviderStep />);

    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("renders Next button", () => {
    render(<AIProviderStep />);

    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("shows Premium AI as default selected provider", () => {
    render(<AIProviderStep />);

    const providerSelect = screen.getByTestId("provider-select");
    expect(providerSelect).toHaveValue("premium");
  });

  it("calls setAiProvider when provider is changed", async () => {
    const user = userEvent.setup();
    render(<AIProviderStep />);

    const providerSelect = screen.getByTestId("provider-select");
    await user.selectOptions(providerSelect, "local");

    expect(mockSetAiProvider).toHaveBeenCalledWith("local");
  });

  it("enables Next button when Premium AI is selected with sufficient credits", () => {
    useWizardStore.setState({ aiProvider: "premium", ollamaModel: null });
    render(<AIProviderStep />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).not.toBeDisabled();
  });

  it("disables Next button when Local AI is selected but no model is chosen", () => {
    useWizardStore.setState({ aiProvider: "local", ollamaModel: null });
    render(<AIProviderStep />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it("enables Next button when Local AI is selected with a model", () => {
    useWizardStore.setState({ aiProvider: "local", ollamaModel: "llama3.2" });
    render(<AIProviderStep />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).not.toBeDisabled();
  });

  it("calls prevStep when Back button is clicked", async () => {
    const user = userEvent.setup();
    render(<AIProviderStep />);

    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);

    expect(mockPrevStep).toHaveBeenCalledTimes(1);
  });

  it("calls nextStep when Next button is clicked", async () => {
    const user = userEvent.setup();
    render(<AIProviderStep />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    expect(mockNextStep).toHaveBeenCalledTimes(1);
  });

  it("shows model selector when Local AI is selected", () => {
    useWizardStore.setState({ aiProvider: "local", ollamaModel: null });
    render(<AIProviderStep />);

    expect(screen.getByTestId("model-select")).toBeInTheDocument();
  });

  it("does not show model selector when Premium AI is selected", () => {
    useWizardStore.setState({ aiProvider: "premium", ollamaModel: null });
    render(<AIProviderStep />);

    expect(screen.queryByTestId("model-select")).not.toBeInTheDocument();
  });

  it("calls setOllamaModel when model is changed", async () => {
    useWizardStore.setState({ aiProvider: "local", ollamaModel: null });
    const user = userEvent.setup();
    render(<AIProviderStep />);

    const modelSelect = screen.getByTestId("model-select");
    await user.selectOptions(modelSelect, "llama3.2");

    expect(mockSetOllamaModel).toHaveBeenCalledWith("llama3.2");
  });

  describe("Design inspiration warning", () => {
    const imageInspiration = [
      { id: "img-1", type: "image" as const, title: "design.png", content: "base64..." },
    ];
    const urlInspiration = [
      { id: "url-1", type: "url" as const, title: "example.com", sourceUrl: "https://example.com" },
    ];
    const pdfInspiration = [
      { id: "pdf-1", type: "pdf" as const, title: "worksheet.pdf", content: "base64..." },
    ];
    const textOnlyInspiration = [
      { id: "text-1", type: "text" as const, title: "Notes", content: "Some text notes" },
    ];

    it("does not show warning when Premium AI is selected with design inspiration", () => {
      useWizardStore.setState({
        aiProvider: "premium",
        ollamaModel: null,
        selectedInspiration: imageInspiration,
      });
      render(<AIProviderStep />);

      expect(screen.queryByText(/Design inspiration will be limited/i)).not.toBeInTheDocument();
    });

    it("does not show warning when Local AI is selected with text-only inspiration", () => {
      useWizardStore.setState({
        aiProvider: "local",
        ollamaModel: "llama3.2",
        selectedInspiration: textOnlyInspiration,
      });
      render(<AIProviderStep />);

      expect(screen.queryByText(/Design inspiration will be limited/i)).not.toBeInTheDocument();
    });

    it("does not show warning when Local AI is selected with no inspiration", () => {
      useWizardStore.setState({
        aiProvider: "local",
        ollamaModel: "llama3.2",
        selectedInspiration: [],
      });
      render(<AIProviderStep />);

      expect(screen.queryByText(/Design inspiration will be limited/i)).not.toBeInTheDocument();
    });

    it("shows warning when Local AI is selected with image inspiration", () => {
      useWizardStore.setState({
        aiProvider: "local",
        ollamaModel: "llama3.2",
        selectedInspiration: imageInspiration,
      });
      render(<AIProviderStep />);

      expect(screen.getByText(/Design inspiration will be limited/i)).toBeInTheDocument();
      expect(screen.getByText(/Local AI cannot analyze visual designs/i)).toBeInTheDocument();
    });

    it("shows warning when Local AI is selected with URL inspiration", () => {
      useWizardStore.setState({
        aiProvider: "local",
        ollamaModel: "llama3.2",
        selectedInspiration: urlInspiration,
      });
      render(<AIProviderStep />);

      expect(screen.getByText(/Design inspiration will be limited/i)).toBeInTheDocument();
    });

    it("shows warning when Local AI is selected with PDF inspiration", () => {
      useWizardStore.setState({
        aiProvider: "local",
        ollamaModel: "llama3.2",
        selectedInspiration: pdfInspiration,
      });
      render(<AIProviderStep />);

      expect(screen.getByText(/Design inspiration will be limited/i)).toBeInTheDocument();
    });

    it("shows warning when Local AI is selected with mixed design inspiration", () => {
      useWizardStore.setState({
        aiProvider: "local",
        ollamaModel: "llama3.2",
        selectedInspiration: [...textOnlyInspiration, ...imageInspiration, ...urlInspiration],
      });
      render(<AIProviderStep />);

      expect(screen.getByText(/Design inspiration will be limited/i)).toBeInTheDocument();
    });
  });
});

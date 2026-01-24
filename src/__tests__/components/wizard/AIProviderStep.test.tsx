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
        <option value="claude">Claude</option>
        <option value="openai">OpenAI</option>
        <option value="ollama">Ollama</option>
      </select>
      {value === "ollama" && (
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

describe("AIProviderStep", () => {
  const mockNextStep = vi.fn();
  const mockPrevStep = vi.fn();
  const mockSetAiProvider = vi.fn();
  const mockSetOllamaModel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useWizardStore.setState({
      aiProvider: "claude",
      ollamaModel: null,
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      setAiProvider: mockSetAiProvider,
      setOllamaModel: mockSetOllamaModel,
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

  it("shows Claude as default selected provider", () => {
    render(<AIProviderStep />);

    const providerSelect = screen.getByTestId("provider-select");
    expect(providerSelect).toHaveValue("claude");
  });

  it("calls setAiProvider when provider is changed", async () => {
    const user = userEvent.setup();
    render(<AIProviderStep />);

    const providerSelect = screen.getByTestId("provider-select");
    await user.selectOptions(providerSelect, "openai");

    expect(mockSetAiProvider).toHaveBeenCalledWith("openai");
  });

  it("enables Next button when Claude is selected", () => {
    useWizardStore.setState({ aiProvider: "claude", ollamaModel: null });
    render(<AIProviderStep />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).not.toBeDisabled();
  });

  it("enables Next button when OpenAI is selected", () => {
    useWizardStore.setState({ aiProvider: "openai", ollamaModel: null });
    render(<AIProviderStep />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).not.toBeDisabled();
  });

  it("disables Next button when Ollama is selected but no model is chosen", () => {
    useWizardStore.setState({ aiProvider: "ollama", ollamaModel: null });
    render(<AIProviderStep />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it("enables Next button when Ollama is selected with a model", () => {
    useWizardStore.setState({ aiProvider: "ollama", ollamaModel: "llama3.2" });
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

  it("shows model selector when Ollama is selected", () => {
    useWizardStore.setState({ aiProvider: "ollama", ollamaModel: null });
    render(<AIProviderStep />);

    expect(screen.getByTestId("model-select")).toBeInTheDocument();
  });

  it("does not show model selector when Claude is selected", () => {
    useWizardStore.setState({ aiProvider: "claude", ollamaModel: null });
    render(<AIProviderStep />);

    expect(screen.queryByTestId("model-select")).not.toBeInTheDocument();
  });

  it("calls setOllamaModel when model is changed", async () => {
    useWizardStore.setState({ aiProvider: "ollama", ollamaModel: null });
    const user = userEvent.setup();
    render(<AIProviderStep />);

    const modelSelect = screen.getByTestId("model-select");
    await user.selectOptions(modelSelect, "llama3.2");

    expect(mockSetOllamaModel).toHaveBeenCalledWith("llama3.2");
  });
});

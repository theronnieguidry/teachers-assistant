import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WizardSteps } from "@/components/wizard/WizardSteps";
import { useWizardStore } from "@/stores/wizardStore";

// Mock child components to avoid complex setup
vi.mock("@/components/wizard/ClassDetailsStep", () => ({
  ClassDetailsStep: () => <div data-testid="class-details-step">Class Details Step</div>,
}));

vi.mock("@/components/wizard/InspirationStep", () => ({
  InspirationStep: () => <div data-testid="inspiration-step">Inspiration Step</div>,
}));

vi.mock("@/components/wizard/AIProviderStep", () => ({
  AIProviderStep: () => <div data-testid="ai-provider-step">AI Provider Step</div>,
}));

vi.mock("@/components/wizard/OutputStep", () => ({
  OutputStep: () => <div data-testid="output-step">Output Step</div>,
}));

vi.mock("@/components/wizard/PromptReviewStep", () => ({
  PromptReviewStep: () => <div data-testid="prompt-review-step">Prompt Review Step</div>,
}));

vi.mock("@/components/wizard/GenerationStep", () => ({
  GenerationStep: () => <div data-testid="generation-step">Generation Step</div>,
}));

describe("WizardSteps", () => {
  beforeEach(() => {
    useWizardStore.setState({
      currentStep: 1,
    });
  });

  it("renders ClassDetailsStep for step 1", () => {
    useWizardStore.setState({ currentStep: 1 });

    render(<WizardSteps />);

    expect(screen.getByTestId("class-details-step")).toBeInTheDocument();
  });

  it("renders InspirationStep for step 2", () => {
    useWizardStore.setState({ currentStep: 2 });

    render(<WizardSteps />);

    expect(screen.getByTestId("inspiration-step")).toBeInTheDocument();
  });

  it("renders AIProviderStep for step 3", () => {
    useWizardStore.setState({ currentStep: 3 });

    render(<WizardSteps />);

    expect(screen.getByTestId("ai-provider-step")).toBeInTheDocument();
  });

  it("renders OutputStep for step 4", () => {
    useWizardStore.setState({ currentStep: 4 });

    render(<WizardSteps />);

    expect(screen.getByTestId("output-step")).toBeInTheDocument();
  });

  it("renders PromptReviewStep for step 5", () => {
    useWizardStore.setState({ currentStep: 5 });

    render(<WizardSteps />);

    expect(screen.getByTestId("prompt-review-step")).toBeInTheDocument();
  });

  it("renders GenerationStep for step 6", () => {
    useWizardStore.setState({ currentStep: 6 });

    render(<WizardSteps />);

    expect(screen.getByTestId("generation-step")).toBeInTheDocument();
  });

  it("renders nothing for invalid step", () => {
    useWizardStore.setState({ currentStep: 7 });

    const { container } = render(<WizardSteps />);

    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for step 0", () => {
    useWizardStore.setState({ currentStep: 0 });

    const { container } = render(<WizardSteps />);

    expect(container.firstChild).toBeNull();
  });

  it("only renders one step at a time", () => {
    useWizardStore.setState({ currentStep: 2 });

    render(<WizardSteps />);

    expect(screen.queryByTestId("class-details-step")).not.toBeInTheDocument();
    expect(screen.getByTestId("inspiration-step")).toBeInTheDocument();
    expect(screen.queryByTestId("ai-provider-step")).not.toBeInTheDocument();
    expect(screen.queryByTestId("output-step")).not.toBeInTheDocument();
    expect(screen.queryByTestId("prompt-review-step")).not.toBeInTheDocument();
    expect(screen.queryByTestId("generation-step")).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardDialog } from "@/components/wizard/WizardDialog";
import { useWizardStore } from "@/stores/wizardStore";

// Mock child components
vi.mock("@/components/wizard/WizardSteps", () => ({
  WizardSteps: () => <div data-testid="wizard-steps">Wizard Steps</div>,
}));

vi.mock("@/components/wizard/WizardProgress", () => ({
  WizardProgress: () => <div data-testid="wizard-progress">Progress</div>,
}));

describe("WizardDialog", () => {
  beforeEach(() => {
    useWizardStore.setState({
      isOpen: false,
      currentStep: 1,
      title: "Test Project",
      prompt: "",
      classDetails: null,
      selectedInspiration: [],
      outputPath: null,
      isGenerating: false,
      generationProgress: 0,
      generationMessage: "",
      generationError: null,
    });
  });

  it("renders nothing when closed", () => {
    render(<WizardDialog />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when open", () => {
    useWizardStore.setState({ isOpen: true });

    render(<WizardDialog />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("displays project title in header", () => {
    useWizardStore.setState({ isOpen: true, title: "My Math Worksheet" });

    render(<WizardDialog />);

    expect(screen.getByText(/Create: My Math Worksheet/)).toBeInTheDocument();
  });

  it("displays 'Generating...' title on step 6", () => {
    useWizardStore.setState({ isOpen: true, currentStep: 6 });

    render(<WizardDialog />);

    expect(screen.getByText("Generating...")).toBeInTheDocument();
  });

  it("renders WizardProgress component", () => {
    useWizardStore.setState({ isOpen: true });

    render(<WizardDialog />);

    expect(screen.getByTestId("wizard-progress")).toBeInTheDocument();
  });

  it("renders WizardSteps component", () => {
    useWizardStore.setState({ isOpen: true });

    render(<WizardDialog />);

    expect(screen.getByTestId("wizard-steps")).toBeInTheDocument();
  });

  it("uses taller dialog sizing for step visibility", () => {
    useWizardStore.setState({ isOpen: true });

    render(<WizardDialog />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("h-[min(94vh,760px)]");
    expect(dialog).toHaveClass("w-[95vw]");
  });

  it("calls closeWizard when dialog is closed", async () => {
    const user = userEvent.setup();
    const closeWizard = vi.fn();
    useWizardStore.setState({ isOpen: true, closeWizard });

    render(<WizardDialog />);

    // Find and click the close button (X)
    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    expect(closeWizard).toHaveBeenCalled();
  });
});

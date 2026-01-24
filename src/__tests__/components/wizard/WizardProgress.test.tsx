import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { useWizardStore } from "@/stores/wizardStore";

describe("WizardProgress", () => {
  beforeEach(() => {
    useWizardStore.setState({
      currentStep: 1,
    });
  });

  it("renders all four step labels", () => {
    render(<WizardProgress />);

    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Inspiration")).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
    expect(screen.getByText("Generate")).toBeInTheDocument();
  });

  it("shows step 1 as current on first step", () => {
    useWizardStore.setState({ currentStep: 1 });

    render(<WizardProgress />);

    // Step 1 should show number 1 (not checkmark)
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows checkmark for completed steps", () => {
    useWizardStore.setState({ currentStep: 3 });

    render(<WizardProgress />);

    // Steps 1 and 2 should have checkmarks (Check icon)
    // Step 3 should show "3"
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    // Steps 1 and 2 should not show numbers since they have checkmarks
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it("shows current step number", () => {
    useWizardStore.setState({ currentStep: 2 });

    render(<WizardProgress />);

    // Step 2 should show number
    expect(screen.getByText("2")).toBeInTheDocument();
    // Steps 3 and 4 should also show numbers (upcoming)
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows future steps as inactive", () => {
    useWizardStore.setState({ currentStep: 1 });

    render(<WizardProgress />);

    // All step numbers should be visible
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows all steps completed on step 4", () => {
    useWizardStore.setState({ currentStep: 4 });

    render(<WizardProgress />);

    // Step 4 should show number, steps 1-3 should have checkmarks
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  it("renders connector lines between steps", () => {
    const { container } = render(<WizardProgress />);

    // There should be 3 connector lines (between 4 steps)
    const connectors = container.querySelectorAll("[class*='w-16 h-0.5']");
    expect(connectors.length).toBe(3);
  });
});

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

  it("renders all six step labels", () => {
    render(<WizardProgress />);

    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Inspiration")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
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
    // Step 3 should show "3", steps 4, 5, and 6 should show their numbers
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    // Steps 1 and 2 should not show numbers since they have checkmarks
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it("shows current step number", () => {
    useWizardStore.setState({ currentStep: 2 });

    render(<WizardProgress />);

    // Step 2 should show number
    expect(screen.getByText("2")).toBeInTheDocument();
    // Steps 3, 4, 5, and 6 should also show numbers (upcoming)
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("shows future steps as inactive", () => {
    useWizardStore.setState({ currentStep: 1 });

    render(<WizardProgress />);

    // All step numbers should be visible
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("shows all steps completed on step 6", () => {
    useWizardStore.setState({ currentStep: 6 });

    render(<WizardProgress />);

    // Step 6 should show number, steps 1-5 should have checkmarks
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
    expect(screen.queryByText("4")).not.toBeInTheDocument();
    expect(screen.queryByText("5")).not.toBeInTheDocument();
  });

  it("renders connector lines between steps", () => {
    const { container } = render(<WizardProgress />);

    // There should be 5 connector lines (between 6 steps)
    const connectors = container.querySelectorAll("[class*='w-16 h-0.5']");
    expect(connectors.length).toBe(5);
  });
});

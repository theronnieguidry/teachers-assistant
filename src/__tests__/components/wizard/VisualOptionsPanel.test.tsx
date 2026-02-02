import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VisualOptionsPanel } from "@/components/wizard/VisualOptionsPanel";
import type { VisualSettings } from "@/types";

describe("VisualOptionsPanel", () => {
  const defaultSettings: VisualSettings = {
    includeVisuals: true,
    richness: "minimal",
    style: "friendly_cartoon",
  };

  const renderComponent = (
    settings: VisualSettings = defaultSettings,
    onChange = vi.fn(),
    disabled = false
  ) => {
    return render(
      <VisualOptionsPanel
        settings={settings}
        onChange={onChange}
        disabled={disabled}
      />
    );
  };

  it("renders the include visuals switch", () => {
    renderComponent();

    expect(screen.getByLabelText(/include ai-generated images/i)).toBeInTheDocument();
  });

  it("toggles include visuals when switch is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderComponent(defaultSettings, onChange);

    const toggle = screen.getByRole("switch");
    await user.click(toggle);

    expect(onChange).toHaveBeenCalledWith({ includeVisuals: false });
  });

  it("shows richness and style options when visuals are included", () => {
    renderComponent({ ...defaultSettings, includeVisuals: true });

    expect(screen.getByText(/visual richness/i)).toBeInTheDocument();
    expect(screen.getByText(/visual style/i)).toBeInTheDocument();
  });

  it("hides richness and style options when visuals are not included", () => {
    renderComponent({ ...defaultSettings, includeVisuals: false });

    expect(screen.queryByText(/visual richness/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/visual style/i)).not.toBeInTheDocument();
  });

  it("displays the current richness value", () => {
    renderComponent({ ...defaultSettings, richness: "standard" });

    expect(screen.getByText(/standard/i)).toBeInTheDocument();
  });

  it("displays the current style value", () => {
    renderComponent({ ...defaultSettings, style: "simple_icons" });

    expect(screen.getByText(/simple icons/i)).toBeInTheDocument();
  });

  it("disables controls when disabled prop is true", () => {
    renderComponent(defaultSettings, vi.fn(), true);

    const toggle = screen.getByRole("switch");
    expect(toggle).toBeDisabled();
  });

  it("shows description text about premium AI images", () => {
    renderComponent();

    expect(
      screen.getByText(/premium ai generates relevant images/i)
    ).toBeInTheDocument();
  });

  it("shows richness option descriptions", () => {
    renderComponent({ ...defaultSettings, includeVisuals: true });

    // The descriptions should be visible in the dropdown
    expect(screen.getByText(/1-2 images/i)).toBeInTheDocument();
  });
});

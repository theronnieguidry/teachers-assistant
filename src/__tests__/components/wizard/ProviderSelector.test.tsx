import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProviderSelector } from "@/components/wizard/ProviderSelector";

describe("ProviderSelector", () => {
  const defaultProps = {
    value: "premium" as const,
    onChange: vi.fn(),
  };

  it("renders both provider options", () => {
    render(<ProviderSelector {...defaultProps} />);

    expect(screen.getByText("Premium AI")).toBeInTheDocument();
    expect(screen.getByText("Local AI")).toBeInTheDocument();
  });

  it("shows provider descriptions and badges", () => {
    render(<ProviderSelector {...defaultProps} />);

    expect(
      screen.getByText(/Best quality - uses cloud-based AI/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Runs on this computer - no image analysis/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Best Quality")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("shows backend-managed Local AI helper copy", () => {
    render(<ProviderSelector {...defaultProps} />);

    expect(
      screen.getByText(/TA manages the local model automatically/i)
    ).toBeInTheDocument();
  });

  it("does not render Local AI status or model-management UI", () => {
    render(<ProviderSelector {...defaultProps} value="local" />);

    expect(screen.queryByText(/Checking local AI status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ready \(/i)).not.toBeInTheDocument();
    expect(screen.queryByText("No models installed")).not.toBeInTheDocument();
    expect(screen.queryByText("Not running")).not.toBeInTheDocument();
    expect(screen.queryByText("Local AI Model")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Start it from Settings|Install a model from Settings/i)
    ).not.toBeInTheDocument();
  });

  it("calls onChange when Premium AI is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<ProviderSelector {...defaultProps} value="local" onChange={onChange} />);
    await user.click(screen.getByText("Premium AI").closest("[role='button']")!);

    expect(onChange).toHaveBeenCalledWith("premium");
  });

  it("calls onChange when Local AI is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<ProviderSelector {...defaultProps} onChange={onChange} />);
    await user.click(screen.getByText("Local AI").closest("[role='button']")!);

    expect(onChange).toHaveBeenCalledWith("local");
  });

  it("prevents selecting Premium AI when disabled", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ProviderSelector
        {...defaultProps}
        onChange={onChange}
        premiumDisabled
      />
    );

    await user.click(screen.getByText("Premium AI").closest("[role='button']")!);

    expect(onChange).not.toHaveBeenCalled();
  });
});

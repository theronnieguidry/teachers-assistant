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

    expect(screen.getByText(/Best quality - uses cloud-based AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Runs on this computer - no image analysis/i)).toBeInTheDocument();
    expect(screen.getByText("Best Quality")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("shows backend-managed local model note", () => {
    render(<ProviderSelector {...defaultProps} />);

    expect(
      screen.getByText(/Model selection is managed automatically by the backend/i)
    ).toBeInTheDocument();
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
});

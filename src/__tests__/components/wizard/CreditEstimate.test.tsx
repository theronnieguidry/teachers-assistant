import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreditEstimate } from "@/components/wizard/CreditEstimate";
import type { EstimateResponse } from "@/types";

describe("CreditEstimate", () => {
  const mockEstimate: EstimateResponse = {
    estimate: {
      minCredits: 3,
      maxCredits: 5,
      expectedCredits: 4,
      breakdown: {
        textGeneration: 3,
        imageGeneration: 1,
        qualityGate: 0,
      },
    },
    disclaimer: "Actual usage may vary. Unused credits are refunded automatically.",
  };

  const defaultProps = {
    estimate: mockEstimate,
    isLoading: false,
    error: null,
    currentBalance: 50,
    onConfirm: vi.fn(),
    onBack: vi.fn(),
  };

  it("renders loading state", () => {
    render(<CreditEstimate {...defaultProps} isLoading={true} estimate={null} />);

    expect(screen.getByText(/calculating estimate/i)).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(
      <CreditEstimate
        {...defaultProps}
        error="Failed to calculate estimate"
        estimate={null}
      />
    );

    expect(screen.getByText(/failed to calculate estimate/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument();
  });

  it("renders nothing when estimate is null and not loading/error", () => {
    const { container } = render(
      <CreditEstimate {...defaultProps} estimate={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("displays estimate breakdown", () => {
    render(<CreditEstimate {...defaultProps} />);

    expect(screen.getByText(/text generation/i)).toBeInTheDocument();
    expect(screen.getByText(/~3 credits/i)).toBeInTheDocument();
    expect(screen.getByText(/image generation/i)).toBeInTheDocument();
    expect(screen.getByText(/~1 credits/i)).toBeInTheDocument();
  });

  it("displays estimated total", () => {
    render(<CreditEstimate {...defaultProps} />);

    expect(screen.getByText(/estimated total/i)).toBeInTheDocument();
    expect(screen.getByText(/3-5 credits/)).toBeInTheDocument();
  });

  it("displays current balance", () => {
    render(<CreditEstimate {...defaultProps} />);

    expect(screen.getByText(/your balance/i)).toBeInTheDocument();
    expect(screen.getByText(/50 credits/)).toBeInTheDocument();
  });

  it("shows success message when balance is sufficient", () => {
    render(<CreditEstimate {...defaultProps} currentBalance={50} />);

    expect(
      screen.getByText(/you have enough credits to proceed/i)
    ).toBeInTheDocument();
  });

  it("shows warning when balance is insufficient", () => {
    render(<CreditEstimate {...defaultProps} currentBalance={2} />);

    expect(screen.getByText(/you need at least/i)).toBeInTheDocument();
  });

  it("displays disclaimer text", () => {
    render(<CreditEstimate {...defaultProps} />);

    expect(
      screen.getByText(/actual usage may vary/i)
    ).toBeInTheDocument();
  });

  it("enables Generate button when balance is sufficient", () => {
    render(<CreditEstimate {...defaultProps} currentBalance={50} />);

    const generateButton = screen.getByRole("button", { name: /generate now/i });
    expect(generateButton).not.toBeDisabled();
  });

  it("disables Generate button when balance is insufficient", () => {
    render(<CreditEstimate {...defaultProps} currentBalance={2} />);

    const generateButton = screen.getByRole("button", { name: /generate now/i });
    expect(generateButton).toBeDisabled();
  });

  it("calls onConfirm when Generate button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<CreditEstimate {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: /generate now/i }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onBack when Back button is clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<CreditEstimate {...defaultProps} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(onBack).toHaveBeenCalled();
  });

  it("displays single credit value when min equals max", () => {
    const singleValueEstimate: EstimateResponse = {
      estimate: {
        minCredits: 4,
        maxCredits: 4,
        expectedCredits: 4,
      },
      disclaimer: "Test",
    };

    render(<CreditEstimate {...defaultProps} estimate={singleValueEstimate} />);

    expect(screen.getByText(/4 credits/)).toBeInTheDocument();
    expect(screen.queryByText(/4-4/)).not.toBeInTheDocument();
  });
});

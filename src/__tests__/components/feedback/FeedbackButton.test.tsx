import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../utils";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";

// Mock the auth hook
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the feedback API
vi.mock("@/services/feedback-api", () => ({
  submitFeedback: vi.fn(),
}));

// Mock the toast store
vi.mock("@/stores/toastStore", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("FeedbackButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: { access_token: "test-token" },
      profile: { email: "test@example.com" },
    });
  });

  it("should render the feedback button with icon", () => {
    render(<FeedbackButton />);

    const button = screen.getByRole("button", { name: "Send feedback" });
    expect(button).toBeInTheDocument();
  });

  it("should show tooltip on hover", async () => {
    const { user } = render(<FeedbackButton />);

    const button = screen.getByRole("button", { name: "Send feedback" });
    await user.hover(button);

    await waitFor(() => {
      // Look for tooltip text (there may be multiple due to tooltip content wrapper)
      const tooltips = screen.getAllByText("Send Feedback");
      expect(tooltips.length).toBeGreaterThan(0);
    });
  });

  it("should open feedback dialog when clicked", async () => {
    const { user } = render(<FeedbackButton />);

    const button = screen.getByRole("button", { name: "Send feedback" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Send Feedback" })).toBeInTheDocument();
    });
  });

  it("should close dialog when clicking close button", async () => {
    const { user } = render(<FeedbackButton />);

    // Open dialog
    const button = screen.getByRole("button", { name: "Send feedback" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Send Feedback" })).toBeInTheDocument();
    });

    // Click Cancel button
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Send Feedback" })).not.toBeInTheDocument();
    });
  });
});

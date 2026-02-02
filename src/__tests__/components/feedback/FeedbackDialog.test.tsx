import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../utils";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { submitFeedback } from "@/services/feedback-api";
import { toast } from "@/stores/toastStore";

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

const mockSubmitFeedback = submitFeedback as ReturnType<typeof vi.fn>;
const mockToast = toast as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

describe("FeedbackDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: { access_token: "test-token" },
      profile: { email: "test@example.com" },
    });
  });

  describe("rendering", () => {
    it("should render the dialog when open", () => {
      render(<FeedbackDialog {...defaultProps} />);

      expect(screen.getByRole("heading", { name: "Send Feedback" })).toBeInTheDocument();
      expect(screen.getByText(/Report a bug or suggest a feature/)).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<FeedbackDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole("heading", { name: "Send Feedback" })).not.toBeInTheDocument();
    });

    it("should render feedback type radio buttons", () => {
      render(<FeedbackDialog {...defaultProps} />);

      expect(screen.getByText("Bug Report")).toBeInTheDocument();
      expect(screen.getByText("Feature Request")).toBeInTheDocument();
    });

    it("should render form fields", () => {
      render(<FeedbackDialog {...defaultProps} />);

      expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Contact Email/)).toBeInTheDocument();
    });

    it("should have bug report selected by default", () => {
      render(<FeedbackDialog {...defaultProps} />);

      const bugRadio = screen.getByRole("radio", { name: /Bug Report/i });
      expect(bugRadio).toBeChecked();
    });
  });

  describe("form validation", () => {
    it("should show error when title is too short", async () => {
      const { user } = render(<FeedbackDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText(/Title/);
      await user.type(titleInput, "Hi");

      const descInput = screen.getByLabelText(/Description/);
      await user.type(descInput, "This is a long enough description for testing");

      const submitButton = screen.getByRole("button", { name: "Submit Feedback" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Title must be at least 5 characters/)).toBeInTheDocument();
      });
    });

    it("should show error when description is too short", async () => {
      const { user } = render(<FeedbackDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText(/Title/);
      await user.type(titleInput, "Valid title here");

      const descInput = screen.getByLabelText(/Description/);
      await user.type(descInput, "Too short");

      const submitButton = screen.getByRole("button", { name: "Submit Feedback" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please provide more details/)).toBeInTheDocument();
      });
    });

    it("should allow empty email since it is optional", async () => {
      mockSubmitFeedback.mockResolvedValueOnce({
        success: true,
        issueNumber: 100,
        issueUrl: "https://github.com/test/repo/issues/100",
      });

      const { user } = render(<FeedbackDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText(/Title/);
      await user.type(titleInput, "Valid title here");

      const descInput = screen.getByLabelText(/Description/);
      await user.type(descInput, "This is a long enough description for testing");

      // Leave email empty (clear the pre-filled value)
      const emailInput = screen.getByLabelText(/Contact Email/);
      await user.clear(emailInput);

      const submitButton = screen.getByRole("button", { name: "Submit Feedback" });
      await user.click(submitButton);

      // Should submit successfully without email
      await waitFor(() => {
        expect(mockSubmitFeedback).toHaveBeenCalled();
      });
    });
  });

  describe("form submission", () => {
    it("should submit bug report successfully", async () => {
      mockSubmitFeedback.mockResolvedValueOnce({
        success: true,
        issueNumber: 42,
        issueUrl: "https://github.com/test/repo/issues/42",
      });

      const onOpenChange = vi.fn();
      const { user } = render(<FeedbackDialog {...defaultProps} onOpenChange={onOpenChange} />);

      const titleInput = screen.getByLabelText(/Title/);
      await user.type(titleInput, "Test bug report");

      const descInput = screen.getByLabelText(/Description/);
      await user.type(descInput, "This is a detailed bug description for testing purposes");

      const submitButton = screen.getByRole("button", { name: "Submit Feedback" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitFeedback).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "bug",
            title: "Test bug report",
            description: "This is a detailed bug description for testing purposes",
          }),
          "test-token"
        );
      });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Feedback submitted",
          expect.stringContaining("#42")
        );
      });

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("should submit feature request successfully", async () => {
      mockSubmitFeedback.mockResolvedValueOnce({
        success: true,
        issueNumber: 43,
        issueUrl: "https://github.com/test/repo/issues/43",
      });

      const { user } = render(<FeedbackDialog {...defaultProps} />);

      // Select feature request
      const featureRadio = screen.getByRole("radio", { name: /Feature Request/i });
      await user.click(featureRadio);

      const titleInput = screen.getByLabelText(/Title/);
      await user.type(titleInput, "New feature idea");

      const descInput = screen.getByLabelText(/Description/);
      await user.type(descInput, "This is a detailed feature request for testing purposes");

      const submitButton = screen.getByRole("button", { name: "Submit Feedback" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitFeedback).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "feature",
          }),
          "test-token"
        );
      });
    });

    it("should show loading state during submission", async () => {
      mockSubmitFeedback.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { user } = render(<FeedbackDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText(/Title/);
      await user.type(titleInput, "Test bug report");

      const descInput = screen.getByLabelText(/Description/);
      await user.type(descInput, "This is a detailed bug description for testing purposes");

      const submitButton = screen.getByRole("button", { name: "Submit Feedback" });
      await user.click(submitButton);

      // Button should be disabled during submission
      expect(submitButton).toBeDisabled();
    });

    it("should show error when submission fails", async () => {
      mockSubmitFeedback.mockRejectedValueOnce(new Error("Network error"));

      const { user } = render(<FeedbackDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText(/Title/);
      await user.type(titleInput, "Test bug report");

      const descInput = screen.getByLabelText(/Description/);
      await user.type(descInput, "This is a detailed bug description for testing purposes");

      const submitButton = screen.getByRole("button", { name: "Submit Feedback" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("should show error when not authenticated", async () => {
      mockUseAuth.mockReturnValue({
        session: null,
        profile: null,
      });

      const { user } = render(<FeedbackDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText(/Title/);
      await user.type(titleInput, "Test bug report");

      const descInput = screen.getByLabelText(/Description/);
      await user.type(descInput, "This is a detailed bug description for testing purposes");

      const submitButton = screen.getByRole("button", { name: "Submit Feedback" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/must be logged in/)).toBeInTheDocument();
      });
    });
  });

  describe("dialog controls", () => {
    it("should call onOpenChange when Cancel is clicked", async () => {
      const onOpenChange = vi.fn();
      const { user } = render(<FeedbackDialog {...defaultProps} onOpenChange={onOpenChange} />);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should not close dialog while submitting", async () => {
      mockSubmitFeedback.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const onOpenChange = vi.fn();
      const { user } = render(<FeedbackDialog {...defaultProps} onOpenChange={onOpenChange} />);

      const titleInput = screen.getByLabelText(/Title/);
      await user.type(titleInput, "Test bug report");

      const descInput = screen.getByLabelText(/Description/);
      await user.type(descInput, "This is a detailed bug description for testing purposes");

      const submitButton = screen.getByRole("button", { name: "Submit Feedback" });
      await user.click(submitButton);

      // Cancel button should be disabled while submitting
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      expect(cancelButton).toBeDisabled();
    });
  });
});

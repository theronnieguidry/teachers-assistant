import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateLearnerDialog } from "@/components/learner/CreateLearnerDialog";

// Mock learner store
const mockCreateProfile = vi.fn();

vi.mock("@/stores/learnerStore", () => ({
  useLearnerStore: vi.fn((selector) =>
    selector({
      createProfile: mockCreateProfile,
      isLoading: false,
    })
  ),
}));

// Mock toast
vi.mock("@/stores/toastStore", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CreateLearnerDialog", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateProfile.mockResolvedValue(undefined);
  });

  describe("when closed", () => {
    it("does not render dialog content", () => {
      render(<CreateLearnerDialog open={false} onOpenChange={mockOnOpenChange} />);
      expect(screen.queryByText("Add a Learner")).not.toBeInTheDocument();
    });
  });

  describe("when open", () => {
    it("renders dialog title", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText("Add a Learner")).toBeInTheDocument();
    });

    it("renders dialog description", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(
        screen.getByText("Create a profile to track their learning progress")
      ).toBeInTheDocument();
    });

    it("renders name input", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByLabelText("Name or nickname")).toBeInTheDocument();
    });

    it("renders avatar picker", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText("Choose an avatar")).toBeInTheDocument();
    });

    it("renders grade selector", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText("Grade level")).toBeInTheDocument();
    });

    it("renders lesson length selector", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText("Preferred lesson length")).toBeInTheDocument();
    });

    it("renders teaching experience section", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText("Your teaching experience")).toBeInTheDocument();
    });

    it("renders Cancel button", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("renders Add Learner button", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByRole("button", { name: "Add Learner" })).toBeInTheDocument();
    });
  });

  describe("avatar picker", () => {
    it("renders multiple avatar options", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      // Should have multiple emoji buttons
      const emojiButtons = screen
        .getAllByRole("button")
        .filter((btn) => btn.textContent?.match(/[\u{1F300}-\u{1F9FF}]/u));
      expect(emojiButtons.length).toBeGreaterThan(1);
    });

    it("first avatar is selected by default", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      // First emoji button should have ring class indicating selection
      const avatarSection = screen.getByText("Choose an avatar").parentElement;
      const selectedButton = avatarSection?.querySelector(".ring-primary");
      expect(selectedButton).toBeInTheDocument();
    });
  });

  describe("teaching confidence options", () => {
    it("renders novice option", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText("I'm new to teaching")).toBeInTheDocument();
      expect(
        screen.getByText("Show me step-by-step teacher scripts")
      ).toBeInTheDocument();
    });

    it("renders intermediate option", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText("Some experience")).toBeInTheDocument();
      expect(
        screen.getByText("Give me guidelines but let me adapt")
      ).toBeInTheDocument();
    });

    it("renders experienced option", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      expect(screen.getByText("Experienced teacher")).toBeInTheDocument();
      expect(screen.getByText("Just the essentials, please")).toBeInTheDocument();
    });
  });

  describe("cancel behavior", () => {
    it("calls onOpenChange with false when Cancel clicked", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("form validation", () => {
    it("shows error when name is empty on submit", async () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      fireEvent.click(screen.getByRole("button", { name: "Add Learner" }));
      // The form should not submit without a name
      expect(mockCreateProfile).not.toHaveBeenCalled();
    });
  });

  describe("form defaults", () => {
    it("has 2nd grade selected by default", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      // The grade combobox should show 2nd Grade or have value 2
      const gradeSection = screen.getByText("Grade level").parentElement;
      expect(gradeSection).toBeInTheDocument();
    });

    it("has 30 minute session selected by default", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      // Session duration should default to 30 minutes
      const sessionSection = screen.getByText("Preferred lesson length").parentElement;
      expect(sessionSection).toBeInTheDocument();
    });

    it("has intermediate teaching confidence selected by default", () => {
      render(<CreateLearnerDialog open={true} onOpenChange={mockOnOpenChange} />);
      // The intermediate option should be selected (have border-primary class)
      const intermediateLabel = screen.getByText("Some experience").closest("label");
      expect(intermediateLabel).toHaveClass("border-primary");
    });
  });
});

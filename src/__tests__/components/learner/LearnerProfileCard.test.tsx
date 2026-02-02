import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LearnerProfileCard } from "@/components/learner/LearnerProfileCard";
import type { LearnerProfile } from "@/types";

// Mock learner store
const mockUpdateProfile = vi.fn();
const mockDeleteProfile = vi.fn();

vi.mock("@/stores/learnerStore", () => ({
  useLearnerStore: vi.fn((selector) =>
    selector({
      updateProfile: mockUpdateProfile,
      deleteProfile: mockDeleteProfile,
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

describe("LearnerProfileCard", () => {
  const mockProfile: LearnerProfile = {
    learnerId: "learner-1",
    displayName: "Emma",
    grade: "2",
    avatarEmoji: "🦊",
    preferences: {
      favoriteSubjects: ["Math"],
      sessionDuration: 30,
      visualLearner: true,
    },
    adultConfidence: "intermediate",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("display", () => {
    it("renders learner name", () => {
      render(<LearnerProfileCard profile={mockProfile} />);
      expect(screen.getByText("Emma")).toBeInTheDocument();
    });

    it("renders avatar emoji", () => {
      render(<LearnerProfileCard profile={mockProfile} />);
      expect(screen.getByText("🦊")).toBeInTheDocument();
    });

    it("renders grade level", () => {
      render(<LearnerProfileCard profile={mockProfile} />);
      expect(screen.getByText("2nd Grade")).toBeInTheDocument();
    });

    it("renders session duration", () => {
      render(<LearnerProfileCard profile={mockProfile} />);
      expect(screen.getByText("30 min lessons")).toBeInTheDocument();
    });

    it("renders default emoji when not set", () => {
      const profileWithoutEmoji = {
        ...mockProfile,
        avatarEmoji: undefined as unknown as string,
      };
      render(<LearnerProfileCard profile={profileWithoutEmoji} />);
      expect(screen.getByText("🎓")).toBeInTheDocument();
    });
  });

  describe("grade labels", () => {
    const gradeTests = [
      { grade: "K", label: "Kindergarten" },
      { grade: "1", label: "1st Grade" },
      { grade: "2", label: "2nd Grade" },
      { grade: "3", label: "3rd Grade" },
      { grade: "4", label: "4th Grade" },
      { grade: "5", label: "5th Grade" },
      { grade: "6", label: "6th Grade" },
    ];

    gradeTests.forEach(({ grade, label }) => {
      it(`displays correct label for grade ${grade}`, () => {
        render(
          <LearnerProfileCard
            profile={{ ...mockProfile, grade: grade as typeof mockProfile.grade }}
          />
        );
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  describe("actions", () => {
    it("shows edit and delete buttons by default", () => {
      render(<LearnerProfileCard profile={mockProfile} />);
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });

    it("hides actions when showActions is false", () => {
      render(<LearnerProfileCard profile={mockProfile} showActions={false} />);
      expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    });

    it("opens edit dialog when edit button clicked", () => {
      render(<LearnerProfileCard profile={mockProfile} />);
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      expect(screen.getByText("Edit Learner")).toBeInTheDocument();
    });

    it("opens delete confirmation when delete button clicked", () => {
      render(<LearnerProfileCard profile={mockProfile} />);
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(screen.getByText("Remove Learner?")).toBeInTheDocument();
    });
  });

  describe("delete confirmation", () => {
    it("shows warning message with learner name", () => {
      render(<LearnerProfileCard profile={mockProfile} />);
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(
        screen.getByText(/Emma's profile and all their learning progress/)
      ).toBeInTheDocument();
    });

    it("closes dialog when Cancel clicked", () => {
      render(<LearnerProfileCard profile={mockProfile} />);
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByText("Remove Learner?")).not.toBeInTheDocument();
    });
  });

  describe("edit dialog", () => {
    it("pre-fills form with current values", () => {
      render(<LearnerProfileCard profile={mockProfile} />);
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));

      // Check name is pre-filled
      const nameInput = screen.getByLabelText("Name");
      expect(nameInput).toHaveValue("Emma");
    });

    it("shows avatar picker", () => {
      render(<LearnerProfileCard profile={mockProfile} />);
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      expect(screen.getByText("Avatar")).toBeInTheDocument();
    });

    it("closes dialog when Cancel clicked", () => {
      render(<LearnerProfileCard profile={mockProfile} />);
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
      expect(screen.queryByText("Edit Learner")).not.toBeInTheDocument();
    });
  });
});

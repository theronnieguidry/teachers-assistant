import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LearnerSwitcher } from "@/components/learner/LearnerSwitcher";
import type { LearnerProfile } from "@/types";

// Mock CreateLearnerDialog
vi.mock("@/components/learner/CreateLearnerDialog", () => ({
  CreateLearnerDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-dialog">Create Dialog</div> : null,
}));

// Mock learner store
const mockSetActiveLearner = vi.fn();
const mockLoadProfiles = vi.fn();

let mockProfiles: LearnerProfile[] = [];
let mockActiveLearnerId: string | null = null;

vi.mock("@/stores/learnerStore", () => ({
  useLearnerStore: vi.fn((selector) =>
    selector({
      profiles: mockProfiles,
      activeLearnerId: mockActiveLearnerId,
      setActiveLearner: mockSetActiveLearner,
      loadProfiles: mockLoadProfiles,
      isLoading: false,
    })
  ),
}));

describe("LearnerSwitcher", () => {
  const mockProfile1: LearnerProfile = {
    learnerId: "learner-1",
    displayName: "Emma",
    grade: "2",
    avatarEmoji: "🦊",
    preferences: {
      favoriteSubjects: [],
      sessionDuration: 30,
      visualLearner: true,
    },
    adultConfidence: "intermediate",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  };

  const mockProfile2: LearnerProfile = {
    learnerId: "learner-2",
    displayName: "Noah",
    grade: "K",
    avatarEmoji: "🦁",
    preferences: {
      favoriteSubjects: [],
      sessionDuration: 15,
      visualLearner: true,
    },
    adultConfidence: "novice",
    createdAt: "2024-01-15T11:00:00Z",
    updatedAt: "2024-01-15T11:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockProfiles = [];
    mockActiveLearnerId = null;
  });

  describe("no profiles state", () => {
    it("shows Add Learner button when no profiles", () => {
      mockProfiles = [];
      render(<LearnerSwitcher />);
      expect(screen.getByText("Add Learner")).toBeInTheDocument();
    });

    it("only shows icon in compact mode", () => {
      mockProfiles = [];
      render(<LearnerSwitcher compact />);
      expect(screen.queryByText("Add Learner")).not.toBeInTheDocument();
      // Button should still be present
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("opens create dialog when Add Learner clicked", () => {
      mockProfiles = [];
      render(<LearnerSwitcher />);
      fireEvent.click(screen.getByText("Add Learner"));
      expect(screen.getByTestId("create-dialog")).toBeInTheDocument();
    });

    it("calls loadProfiles on mount", () => {
      mockProfiles = [];
      render(<LearnerSwitcher />);
      expect(mockLoadProfiles).toHaveBeenCalled();
    });
  });

  describe("with profiles", () => {
    beforeEach(() => {
      mockProfiles = [mockProfile1, mockProfile2];
      mockActiveLearnerId = "learner-1";
    });

    it("renders select component", () => {
      render(<LearnerSwitcher />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("displays active learner name", () => {
      render(<LearnerSwitcher />);
      expect(screen.getByText("Emma")).toBeInTheDocument();
    });

    it("displays active learner emoji", () => {
      render(<LearnerSwitcher />);
      expect(screen.getByText("🦊")).toBeInTheDocument();
    });

    it("shows default emoji when learner has no emoji", () => {
      mockProfiles = [{ ...mockProfile1, avatarEmoji: undefined as unknown as string }];
      render(<LearnerSwitcher />);
      expect(screen.getByText("🎓")).toBeInTheDocument();
    });
  });

  describe("select trigger width", () => {
    beforeEach(() => {
      mockProfiles = [mockProfile1];
      mockActiveLearnerId = "learner-1";
    });

    it("has default width", () => {
      render(<LearnerSwitcher />);
      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveClass("w-[180px]");
    });

    it("has compact width in compact mode", () => {
      render(<LearnerSwitcher compact />);
      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveClass("w-[140px]");
    });
  });

  describe("profile loading", () => {
    it("calls loadProfiles on mount with profiles", () => {
      mockProfiles = [mockProfile1];
      render(<LearnerSwitcher />);
      expect(mockLoadProfiles).toHaveBeenCalled();
    });
  });
});

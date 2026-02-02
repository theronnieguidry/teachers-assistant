import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TodayView } from "@/components/learning-path/TodayView";

// Mock stores
const mockLoadProfiles = vi.fn();
const mockLoadMastery = vi.fn();
const mockMarkObjectiveStarted = vi.fn();
const mockOpenWizardFromObjective = vi.fn();

let mockProfiles: Array<{
  learnerId: string;
  displayName: string;
  grade: string;
  avatarEmoji: string;
}> = [];
let mockActiveLearnerId: string | null = null;
let mockMasteryData: { learnerId: string; objectives: Record<string, unknown> } | null = null;

// Mock curriculum functions for computing derived state
vi.mock("@/lib/curriculum", () => ({
  getNextRecommendedObjective: vi.fn(),
  getAllSubjectProgress: vi.fn(() => []),
}));

import { getNextRecommendedObjective, getAllSubjectProgress } from "@/lib/curriculum";
const mockGetNextRecommendedObjective = getNextRecommendedObjective as ReturnType<typeof vi.fn>;
const mockGetAllSubjectProgress = getAllSubjectProgress as ReturnType<typeof vi.fn>;

vi.mock("@/stores/learnerStore", () => ({
  useLearnerStore: vi.fn((selector) =>
    selector({
      profiles: mockProfiles,
      activeLearnerId: mockActiveLearnerId,
      masteryData: mockMasteryData,
      loadProfiles: mockLoadProfiles,
      loadMastery: mockLoadMastery,
      markObjectiveStarted: mockMarkObjectiveStarted,
    })
  ),
}));

vi.mock("@/stores/wizardStore", () => ({
  useWizardStore: vi.fn((selector) =>
    selector({
      openWizardFromObjective: mockOpenWizardFromObjective,
    })
  ),
}));

// Mock CreateLearnerDialog
vi.mock("@/components/learner", () => ({
  CreateLearnerDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-learner-dialog">Create Learner Dialog</div> : null,
}));

describe("TodayView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfiles = [];
    mockActiveLearnerId = null;
    mockMasteryData = null;
    mockGetNextRecommendedObjective.mockReturnValue(null);
    mockGetAllSubjectProgress.mockReturnValue([]);
  });

  describe("no profiles state", () => {
    it("shows welcome message when no profiles exist", () => {
      mockProfiles = [];
      render(<TodayView />);
      expect(screen.getByText("Welcome to Learning Path!")).toBeInTheDocument();
    });

    it("shows add learner button", () => {
      mockProfiles = [];
      render(<TodayView />);
      expect(screen.getByText("Add Your First Learner")).toBeInTheDocument();
    });

    it("opens create learner dialog when button clicked", () => {
      mockProfiles = [];
      render(<TodayView />);
      fireEvent.click(screen.getByText("Add Your First Learner"));
      expect(screen.getByTestId("create-learner-dialog")).toBeInTheDocument();
    });

    it("calls loadProfiles on mount", () => {
      mockProfiles = [];
      render(<TodayView />);
      expect(mockLoadProfiles).toHaveBeenCalled();
    });
  });

  describe("no active profile state", () => {
    it("shows select learner message", () => {
      mockProfiles = [
        { learnerId: "1", displayName: "Test", grade: "2", avatarEmoji: "🦊" },
      ];
      mockActiveLearnerId = null; // No active learner selected
      render(<TodayView />);
      expect(screen.getByText("Select a Learner")).toBeInTheDocument();
    });
  });

  describe("with active profile", () => {
    beforeEach(() => {
      mockProfiles = [
        { learnerId: "1", displayName: "Emma", grade: "2", avatarEmoji: "🦊" },
      ];
      mockActiveLearnerId = "1";
      mockMasteryData = { learnerId: "1", objectives: {} };
      mockGetAllSubjectProgress.mockReturnValue([
        { subject: "Math", totalObjectives: 20, mastered: 5, percentComplete: 25 },
        { subject: "Reading", totalObjectives: 15, mastered: 3, percentComplete: 20 },
      ]);
    });

    it("shows greeting with learner name", () => {
      render(<TodayView />);
      // Greeting changes based on time of day, so check for name and emoji
      expect(screen.getByText(/Emma!/)).toBeInTheDocument();
      expect(screen.getByText(/🦊/)).toBeInTheDocument();
    });

    it("shows overall progress section", () => {
      render(<TodayView />);
      expect(screen.getByText("Overall Progress")).toBeInTheDocument();
    });

    it("shows progress by subject section", () => {
      render(<TodayView />);
      expect(screen.getByText("Progress by Subject")).toBeInTheDocument();
    });

    it("displays subject progress cards", () => {
      render(<TodayView />);
      expect(screen.getByText("Math")).toBeInTheDocument();
      expect(screen.getByText("Reading")).toBeInTheDocument();
    });

    it("loads mastery when active profile exists", () => {
      render(<TodayView />);
      expect(mockLoadMastery).toHaveBeenCalledWith("1");
    });
  });

  describe("with next objective", () => {
    beforeEach(() => {
      mockProfiles = [
        { learnerId: "1", displayName: "Emma", grade: "2", avatarEmoji: "🦊" },
      ];
      mockActiveLearnerId = "1";
      mockMasteryData = { learnerId: "1", objectives: {} };
      mockGetNextRecommendedObjective.mockReturnValue({
        objective: {
          id: "math-2-1",
          text: "Add two-digit numbers",
          difficulty: "standard",
          estimatedMinutes: 20,
        },
        unit: { title: "Addition", grade: "2" },
        subject: "Math",
        whyRecommended: "Foundation skill",
        masteryState: "not_started",
      });
      mockGetAllSubjectProgress.mockReturnValue([]);
    });

    it("shows next up card", () => {
      render(<TodayView />);
      expect(screen.getByText("Next Up")).toBeInTheDocument();
    });

    it("displays objective text", () => {
      render(<TodayView />);
      expect(screen.getByText("Add two-digit numbers")).toBeInTheDocument();
    });

    it("displays estimated time", () => {
      render(<TodayView />);
      expect(screen.getByText("20 min")).toBeInTheDocument();
    });

    it("shows Start Lesson button", () => {
      render(<TodayView />);
      expect(screen.getByText("Start Lesson")).toBeInTheDocument();
    });

    it("shows Quick Practice button", () => {
      render(<TodayView />);
      expect(screen.getByText("Quick Practice")).toBeInTheDocument();
    });
  });

  describe("all caught up state", () => {
    beforeEach(() => {
      mockProfiles = [
        { learnerId: "1", displayName: "Emma", grade: "2", avatarEmoji: "🦊" },
      ];
      mockActiveLearnerId = "1";
      mockMasteryData = { learnerId: "1", objectives: {} };
      mockGetNextRecommendedObjective.mockReturnValue(null);
      mockGetAllSubjectProgress.mockReturnValue([]);
    });

    it("shows all caught up message", () => {
      render(<TodayView />);
      expect(screen.getByText("All caught up!")).toBeInTheDocument();
    });

    it("shows explore learning path button", () => {
      render(<TodayView />);
      expect(screen.getByText("Explore Learning Path")).toBeInTheDocument();
    });

    it("calls onNavigateToLearningPath when explore button clicked", () => {
      const handleNavigate = vi.fn();
      render(<TodayView onNavigateToLearningPath={handleNavigate} />);
      fireEvent.click(screen.getByText("Explore Learning Path"));
      expect(handleNavigate).toHaveBeenCalled();
    });
  });

  describe("navigation", () => {
    beforeEach(() => {
      mockProfiles = [
        { learnerId: "1", displayName: "Emma", grade: "2", avatarEmoji: "🦊" },
      ];
      mockActiveLearnerId = "1";
      mockMasteryData = { learnerId: "1", objectives: {} };
      mockGetAllSubjectProgress.mockReturnValue([
        { subject: "Math", totalObjectives: 20, mastered: 5, percentComplete: 25 },
      ]);
    });

    it("calls onNavigateToLearningPath with subject when progress card clicked", () => {
      const handleNavigate = vi.fn();
      render(<TodayView onNavigateToLearningPath={handleNavigate} />);
      fireEvent.click(screen.getByText("Math"));
      expect(handleNavigate).toHaveBeenCalledWith("Math");
    });
  });
});

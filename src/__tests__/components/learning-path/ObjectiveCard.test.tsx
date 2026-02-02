import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ObjectiveCard } from "@/components/learning-path/ObjectiveCard";
import type { CurriculumObjective, CurriculumUnit, MasteryState } from "@/types";

// Mock stores
vi.mock("@/stores/wizardStore", () => ({
  useWizardStore: vi.fn((selector) =>
    selector({
      openWizardFromObjective: vi.fn(),
    })
  ),
}));

vi.mock("@/stores/learnerStore", () => ({
  useLearnerStore: vi.fn((selector) =>
    selector({
      profiles: [
        {
          learnerId: "learner-1",
          displayName: "Test Learner",
          grade: "2",
        },
      ],
      activeLearnerId: "learner-1",
      markObjectiveStarted: vi.fn(),
      markObjectiveMastered: vi.fn(),
    })
  ),
}));

describe("ObjectiveCard", () => {
  const mockObjective: CurriculumObjective = {
    id: "math-2-1",
    text: "Add two-digit numbers with regrouping",
    difficulty: "standard",
    estimatedMinutes: 20,
    vocabulary: ["sum", "regrouping", "place value"],
    activities: ["Practice with manipulatives"],
    prereqs: [],
    misconceptions: ["Students may forget to carry"],
  };

  const mockUnit: CurriculumUnit = {
    unitId: "math-2-u3",
    title: "Addition Strategies",
    grade: "2",
    sequence: 3,
    objectives: [mockObjective],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("default (non-compact) mode", () => {
    it("renders objective text", () => {
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
        />
      );
      expect(
        screen.getByText("Add two-digit numbers with regrouping")
      ).toBeInTheDocument();
    });

    it("displays estimated time", () => {
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
        />
      );
      expect(screen.getByText("20 min")).toBeInTheDocument();
    });

    it("displays difficulty level", () => {
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
        />
      );
      expect(screen.getByText("standard")).toBeInTheDocument();
    });

    it("shows Start Lesson button for not_started state", () => {
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
        />
      );
      expect(screen.getByText("Start Lesson")).toBeInTheDocument();
    });

    it("shows Continue button for in_progress state", () => {
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="in_progress"
        />
      );
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    it("shows Practice button", () => {
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
        />
      );
      expect(screen.getByText("Practice")).toBeInTheDocument();
    });

    it("shows mark complete button when not mastered", () => {
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="in_progress"
        />
      );
      expect(screen.getByTitle("Mark as mastered")).toBeInTheDocument();
    });

    it("hides mark complete button when already mastered", () => {
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="mastered"
        />
      );
      expect(screen.queryByTitle("Mark as mastered")).not.toBeInTheDocument();
    });

    it("displays misconceptions warning when needs_review", () => {
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="needs_review"
        />
      );
      expect(screen.getByText("Common challenges:")).toBeInTheDocument();
      expect(
        screen.getByText("Students may forget to carry")
      ).toBeInTheDocument();
    });

    it("does not display misconceptions when not needs_review", () => {
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
        />
      );
      expect(screen.queryByText("Common challenges:")).not.toBeInTheDocument();
    });
  });

  describe("compact mode", () => {
    it("renders objective text (truncated)", () => {
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
          compact
        />
      );
      expect(
        screen.getByText("Add two-digit numbers with regrouping")
      ).toBeInTheDocument();
    });

    it("displays estimated time", () => {
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
          compact
        />
      );
      expect(screen.getByText("20 min")).toBeInTheDocument();
    });

    it("has play button", () => {
      const { container } = render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
          compact
        />
      );
      // Play button should exist
      expect(container.querySelector("button")).toBeInTheDocument();
    });
  });

  describe("difficulty styling", () => {
    it("applies green color for easy difficulty", () => {
      render(
        <ObjectiveCard
          objective={{ ...mockObjective, difficulty: "easy" }}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
        />
      );
      const difficultyText = screen.getByText("easy");
      expect(difficultyText).toHaveClass("text-green-600");
    });

    it("applies orange color for challenge difficulty", () => {
      render(
        <ObjectiveCard
          objective={{ ...mockObjective, difficulty: "challenge" }}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
        />
      );
      const difficultyText = screen.getByText("challenge");
      expect(difficultyText).toHaveClass("text-orange-600");
    });
  });

  describe("mastery states", () => {
    const states: MasteryState[] = [
      "not_started",
      "in_progress",
      "mastered",
      "needs_review",
    ];

    states.forEach((state) => {
      it(`renders correctly for ${state} state`, () => {
        const { container } = render(
          <ObjectiveCard
            objective={mockObjective}
            unit={mockUnit}
            subject="Math"
            masteryState={state}
          />
        );
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });

  describe("callbacks", () => {
    it("calls onStartLesson when Start Lesson button is clicked", async () => {
      const handleStartLesson = vi.fn();
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
          onStartLesson={handleStartLesson}
        />
      );

      fireEvent.click(screen.getByText("Start Lesson"));
      await waitFor(() => {
        expect(handleStartLesson).toHaveBeenCalled();
      });
    });

    it("calls onPractice when Practice button is clicked", () => {
      const handlePractice = vi.fn();
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="not_started"
          onPractice={handlePractice}
        />
      );

      fireEvent.click(screen.getByText("Practice"));
      expect(handlePractice).toHaveBeenCalled();
    });

    it("calls onMarkComplete when mark complete button is clicked", async () => {
      const handleMarkComplete = vi.fn();
      render(
        <ObjectiveCard
          objective={mockObjective}
          unit={mockUnit}
          subject="Math"
          masteryState="in_progress"
          onMarkComplete={handleMarkComplete}
        />
      );

      fireEvent.click(screen.getByTitle("Mark as mastered"));
      await waitFor(() => {
        expect(handleMarkComplete).toHaveBeenCalled();
      });
    });
  });
});

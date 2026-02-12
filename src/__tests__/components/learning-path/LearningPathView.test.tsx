import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LearningPathView } from "@/components/learning-path/LearningPathView";

// Mock curriculum functions
vi.mock("@/lib/curriculum", () => ({
  getSubjects: () => ["Math", "Reading", "Writing", "Science", "Social Studies"],
  getUnitsForGrade: vi.fn(() => [
    {
      unitId: "math-2-u1",
      title: "Numbers and Place Value",
      grade: "2",
      sequence: 1,
      objectives: [
        {
          id: "obj-1",
          text: "Count to 100",
          difficulty: "easy",
          estimatedMinutes: 15,
          vocabulary: [],
          activities: [],
          prereqs: [],
          misconceptions: [],
        },
        {
          id: "obj-2",
          text: "Understand place value",
          difficulty: "standard",
          estimatedMinutes: 20,
          vocabulary: [],
          activities: [],
          prereqs: [],
          misconceptions: [],
        },
      ],
    },
    {
      unitId: "math-2-u2",
      title: "Addition Strategies",
      grade: "2",
      sequence: 2,
      objectives: [
        {
          id: "obj-3",
          text: "Add single digits",
          difficulty: "easy",
          estimatedMinutes: 15,
          vocabulary: [],
          activities: [],
          prereqs: [],
          misconceptions: [],
        },
      ],
    },
  ]),
  getSubjectProgress: () => ({
    subject: "Math",
    totalObjectives: 3,
    mastered: 1,
    inProgress: 1,
    needsReview: 0,
    notStarted: 1,
    percentComplete: 33,
  }),
  getAllSubjectProgress: () => [
    { subject: "Math", percentComplete: 33 },
    { subject: "Reading", percentComplete: 50 },
  ],
  getObjectiveById: vi.fn((objectiveId: string) => {
    if (objectiveId === "obj-2") {
      return {
        subject: "Math",
        unit: {
          unitId: "math-2-u1",
          title: "Numbers and Place Value",
          grade: "2",
          sequence: 1,
          objectives: [],
        },
        objective: {
          id: "obj-2",
          text: "Understand place value",
          difficulty: "standard",
          estimatedMinutes: 20,
          vocabulary: [],
          activities: [],
          prereqs: [],
          misconceptions: [],
        },
      };
    }
    return null;
  }),
}));

// Mock learner store - now uses profiles + activeLearnerId instead of getActiveProfile
let mockProfiles: Array<{ learnerId: string; displayName: string; grade: string }> = [];
let mockActiveLearnerId: string | null = null;
let mockMasteryData: { objectives: Record<string, { state: string }> } | null = null;
const mockLoadMastery = vi.fn();

vi.mock("@/stores/learnerStore", () => ({
  useLearnerStore: vi.fn((selector) =>
    selector({
      profiles: mockProfiles,
      activeLearnerId: mockActiveLearnerId,
      masteryData: mockMasteryData,
      loadMastery: mockLoadMastery,
    })
  ),
}));

// Mock ObjectiveCard to simplify testing
vi.mock("@/components/learning-path/ObjectiveCard", () => ({
  ObjectiveCard: ({
    objective,
    highlighted,
  }: {
    objective: { id: string; text: string };
    highlighted?: boolean;
  }) => (
    <div
      data-testid="objective-card"
      data-objective-id={objective.id}
      data-highlighted={highlighted ? "true" : "false"}
    >
      {objective.text}
    </div>
  ),
}));

describe("LearningPathView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfiles = [];
    mockActiveLearnerId = null;
    mockMasteryData = null;
  });

  describe("no active profile", () => {
    it("shows select learner message", () => {
      mockProfiles = [];
      mockActiveLearnerId = null;
      render(<LearningPathView />);
      expect(
        screen.getByText("Select a learner to view their learning path.")
      ).toBeInTheDocument();
    });
  });

  describe("with active profile", () => {
    beforeEach(() => {
      mockProfiles = [
        {
          learnerId: "learner-1",
          displayName: "Emma",
          grade: "2",
        },
      ];
      mockActiveLearnerId = "learner-1";
      mockMasteryData = {
        objectives: {
          "obj-1": { state: "mastered" },
          "obj-2": { state: "in_progress" },
        },
      };
    });

    it("shows subject name in header", () => {
      render(<LearningPathView />);
      expect(screen.getByText("Math Learning Path")).toBeInTheDocument();
    });

    it("shows learner info in header", () => {
      render(<LearningPathView />);
      expect(screen.getByText(/Grade 2.*Emma/)).toBeInTheDocument();
    });

    it("shows progress percentage", () => {
      render(<LearningPathView />);
      expect(screen.getByText("33%")).toBeInTheDocument();
    });

    it("shows mastered count", () => {
      render(<LearningPathView />);
      expect(screen.getByText(/1 of 3 mastered/)).toBeInTheDocument();
    });

    it("shows subject tabs", () => {
      render(<LearningPathView />);
      // Check that subject tabs are rendered
      expect(screen.getByRole("tab", { name: /Math/ })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Reading/ })).toBeInTheDocument();
    });

    it("shows filter buttons", () => {
      render(<LearningPathView />);
      expect(screen.getByText("All")).toBeInTheDocument();
      expect(screen.getByText("Not Started")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Mastered")).toBeInTheDocument();
    });

    it("shows unit cards", () => {
      render(<LearningPathView />);
      expect(screen.getByText("Numbers and Place Value")).toBeInTheDocument();
      expect(screen.getByText("Addition Strategies")).toBeInTheDocument();
    });

    it("loads mastery on mount", () => {
      render(<LearningPathView />);
      expect(mockLoadMastery).toHaveBeenCalledWith("learner-1");
    });
  });

  describe("initial subject", () => {
    beforeEach(() => {
      mockProfiles = [
        {
          learnerId: "learner-1",
          displayName: "Emma",
          grade: "2",
        },
      ];
      mockActiveLearnerId = "learner-1";
      mockMasteryData = { objectives: {} };
    });

    it("defaults to Math", () => {
      render(<LearningPathView />);
      expect(screen.getByText("Math Learning Path")).toBeInTheDocument();
    });

    it("can start with a different subject", () => {
      render(<LearningPathView initialSubject="Reading" />);
      expect(screen.getByText("Reading Learning Path")).toBeInTheDocument();
    });
  });

  describe("unit expansion", () => {
    beforeEach(() => {
      mockProfiles = [
        {
          learnerId: "learner-1",
          displayName: "Emma",
          grade: "2",
        },
      ];
      mockActiveLearnerId = "learner-1";
      mockMasteryData = { objectives: {} };
    });

    it("units start collapsed", () => {
      render(<LearningPathView />);
      // Objective cards should not be visible initially
      expect(screen.queryAllByTestId("objective-card")).toHaveLength(0);
    });

    it("clicking unit header expands it", () => {
      render(<LearningPathView />);
      fireEvent.click(screen.getByText("Numbers and Place Value"));
      // Now objectives should be visible
      expect(screen.getAllByTestId("objective-card").length).toBeGreaterThan(0);
    });

    it("clicking expanded unit collapses it", () => {
      render(<LearningPathView />);
      // Expand
      fireEvent.click(screen.getByText("Numbers and Place Value"));
      expect(screen.getAllByTestId("objective-card").length).toBeGreaterThan(0);
      // Collapse
      fireEvent.click(screen.getByText("Numbers and Place Value"));
      expect(screen.queryAllByTestId("objective-card")).toHaveLength(0);
    });

    it("expands and highlights objective when highlightObjectiveId is provided", () => {
      render(<LearningPathView highlightObjectiveId="obj-2" />);
      const highlighted = screen.getAllByTestId("objective-card").find((node) =>
        node.getAttribute("data-objective-id") === "obj-2"
      );
      expect(highlighted).toBeTruthy();
      expect(highlighted?.getAttribute("data-highlighted")).toBe("true");
    });
  });

  describe("filtering", () => {
    beforeEach(() => {
      mockProfiles = [
        {
          learnerId: "learner-1",
          displayName: "Emma",
          grade: "2",
        },
      ];
      mockActiveLearnerId = "learner-1";
      mockMasteryData = { objectives: {} };
    });

    it("shows counts for each filter", () => {
      render(<LearningPathView />);
      // All and Not Started should both show (3) for total objectives
      const countElements = screen.getAllByText("(3)");
      expect(countElements.length).toBeGreaterThan(0);
    });

    it("all filters are rendered", () => {
      render(<LearningPathView />);
      const masteredButton = screen.getByRole("button", { name: /Mastered/ });
      expect(masteredButton).toBeInTheDocument();
    });
  });

  describe("subject switching", () => {
    beforeEach(() => {
      mockProfiles = [
        {
          learnerId: "learner-1",
          displayName: "Emma",
          grade: "2",
        },
      ];
      mockActiveLearnerId = "learner-1";
      mockMasteryData = { objectives: {} };
    });

    it("subject tabs are clickable", () => {
      render(<LearningPathView />);
      const readingTab = screen.getByRole("tab", { name: /Reading/ });
      // Just verify we can click without errors
      fireEvent.click(readingTab);
      expect(readingTab).toBeInTheDocument();
    });
  });
});

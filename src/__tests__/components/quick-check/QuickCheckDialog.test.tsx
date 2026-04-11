import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuickCheckDialog } from "@/components/quick-check";

const mockSubmitQuickCheck = vi.fn();
const mockOpenWizardFromObjective = vi.fn();
const mockOpenWizardForRemediation = vi.fn();

vi.mock("@/stores/learnerStore", () => ({
  useLearnerStore: vi.fn((selector) =>
    selector({
      submitQuickCheck: mockSubmitQuickCheck,
    })
  ),
}));

vi.mock("@/stores/wizardStore", () => ({
  useWizardStore: vi.fn((selector) =>
    selector({
      openWizardFromObjective: mockOpenWizardFromObjective,
      openWizardForRemediation: mockOpenWizardForRemediation,
    })
  ),
}));

const learner = {
  learnerId: "learner-1",
  displayName: "Emma",
  grade: "2" as const,
  avatarEmoji: "🦊",
  preferences: {
    favoriteSubjects: ["Math"],
    sessionDuration: 30 as const,
    visualLearner: true,
  },
  adultConfidence: "intermediate" as const,
  createdAt: "2026-04-10T12:00:00.000Z",
  updatedAt: "2026-04-10T12:00:00.000Z",
};

const objective = {
  id: "math-2-1",
  text: "Add two-digit numbers with regrouping",
  difficulty: "standard" as const,
  estimatedMinutes: 20,
  vocabulary: ["sum"],
  activities: ["Solve three examples"],
  prereqs: [],
  misconceptions: ["Forgetting to carry"],
};

describe("QuickCheckDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders three checkpoints", () => {
    render(
      <QuickCheckDialog
        open
        onOpenChange={vi.fn()}
        objective={objective}
        subject="Math"
        learner={learner}
      />
    );

    expect(screen.getAllByText(/Checkpoint \d/)).toHaveLength(3);
  });

  it("keeps submit disabled until all checkpoints are marked", () => {
    render(
      <QuickCheckDialog
        open
        onOpenChange={vi.fn()}
        objective={objective}
        subject="Math"
        learner={learner}
      />
    );

    const submitButton = screen.getByRole("button", { name: "Save Quick Check" });
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getAllByRole("button", { name: "Correct" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Correct" })[1]);
    fireEvent.click(screen.getAllByRole("button", { name: "Correct" })[2]);

    expect(submitButton).toBeEnabled();
  });

  it("shows practice recommendation and opens worksheet practice flow", async () => {
    mockSubmitQuickCheck.mockResolvedValue({
      resultId: "result-1",
      learnerId: "learner-1",
      objectiveId: "math-2-1",
      subject: "Math",
      score: 67,
      totalQuestions: 3,
      correctAnswers: 2,
      items: [],
      recommendation: "practice",
      wrongAnswerSummary: "Needs another round on regrouping.",
      createdAt: "2026-04-10T12:00:00.000Z",
    });

    render(
      <QuickCheckDialog
        open
        onOpenChange={vi.fn()}
        objective={objective}
        subject="Math"
        learner={learner}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Correct" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Correct" })[1]);
    fireEvent.click(screen.getAllByRole("button", { name: "Needs help" })[2]);
    fireEvent.click(screen.getByRole("button", { name: "Save Quick Check" }));

    await screen.findByText("67% • Mastery updated to in progress.");
    fireEvent.click(screen.getByRole("button", { name: "Practice Again" }));

    expect(mockOpenWizardFromObjective).toHaveBeenCalledWith(
      expect.objectContaining({ id: "math-2-1" }),
      expect.objectContaining({ learnerId: "learner-1" }),
      "worksheet"
    );
  });

  it("shows remediation CTA on low score and opens remediation flow", async () => {
    mockSubmitQuickCheck.mockResolvedValue({
      resultId: "result-2",
      learnerId: "learner-1",
      objectiveId: "math-2-1",
      subject: "Math",
      score: 33,
      totalQuestions: 3,
      correctAnswers: 1,
      items: [
        {
          checkpointId: "math-2-1-core",
          kind: "core",
          prompt: "Can the learner demonstrate this skill?",
          correct: false,
        },
      ],
      recommendation: "remediate",
      wrongAnswerSummary: "Needs support with the core skill.",
      createdAt: "2026-04-10T12:00:00.000Z",
    });

    render(
      <QuickCheckDialog
        open
        onOpenChange={vi.fn()}
        objective={objective}
        subject="Math"
        learner={learner}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Needs help" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Correct" })[1]);
    fireEvent.click(screen.getAllByRole("button", { name: "Needs help" })[2]);
    fireEvent.click(screen.getByRole("button", { name: "Save Quick Check" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Generate Remediation" })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate Remediation" }));
    expect(mockOpenWizardForRemediation).toHaveBeenCalledWith(
      expect.objectContaining({ id: "math-2-1" }),
      expect.objectContaining({ learnerId: "learner-1" }),
      expect.objectContaining({ recommendation: "remediate" })
    );
  });
});

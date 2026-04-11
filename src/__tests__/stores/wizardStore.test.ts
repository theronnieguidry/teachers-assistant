import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectOptions, useWizardStore } from "@/stores/wizardStore";
import { useProjectStore } from "@/stores/projectStore";
import { useInspirationStore } from "@/stores/inspirationStore";
import { useDesignPackStore } from "@/stores/designPackStore";
import { useProjectContextStore } from "@/stores/projectContextStore";
import {
  bulkUpsertInspirationItems,
  getInspirationItems,
} from "@/services/inspiration-storage";

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: {
    getState: vi.fn(() => ({
      projects: [],
      fetchProjectInspiration: vi.fn().mockResolvedValue([]),
    })),
  },
}));

vi.mock("@/services/inspiration-storage", () => ({
  getInspirationItems: vi.fn(),
  bulkUpsertInspirationItems: vi.fn(),
}));

describe("wizardStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWizardStore.getState().reset();
    useProjectContextStore.getState().reset();
    useInspirationStore.setState({
      items: [],
      isLoading: false,
      error: null,
    });
    useDesignPackStore.setState({
      packs: [],
      packWarnings: {},
      isLoading: false,
      error: null,
      currentPackId: null,
      currentPack: null,
      selectedPackId: null,
      selectedPackOrigin: null,
    });
    vi.mocked(getInspirationItems).mockResolvedValue([]);
    vi.mocked(bulkUpsertInspirationItems).mockResolvedValue([]);
  });

  it("starts with canonical selected inspiration ids", () => {
    const state = useWizardStore.getState();
    expect(state.selectedInspirationIds).toEqual([]);
    expect(state.getSelectedInspirationItems()).toEqual([]);
  });

  it("dedupes selected inspiration ids", () => {
    useWizardStore.getState().setSelectedInspirationIds(["item-1", "item-1", "item-2"]);
    expect(useWizardStore.getState().selectedInspirationIds).toEqual(["item-1", "item-2"]);
  });

  it("resolves selected inspiration items from the canonical inspiration store", () => {
    useInspirationStore.setState({
      items: [
        { id: "item-1", type: "url", title: "Example" },
        { id: "item-2", type: "pdf", title: "Unit Notes" },
      ],
    });
    useWizardStore.getState().setSelectedInspirationIds(["item-2"]);

    expect(useWizardStore.getState().getSelectedInspirationItems()).toEqual([
      expect.objectContaining({ id: "item-2", title: "Unit Notes" }),
    ]);
  });

  it("merges selected inspiration and selected pack items deterministically", () => {
    useInspirationStore.setState({
      items: [
        {
          id: "item-1",
          type: "url",
          title: "Example",
          sourceUrl: "https://example.com",
        },
      ],
    });
    useWizardStore.getState().setSelectedInspirationIds(["item-1"]);
    useDesignPackStore.setState({
      packs: [
        {
          packId: "pack-1",
          name: "Spring",
          items: [
            {
              id: "pack-dup",
              type: "url",
              title: "Example",
              sourceUrl: "https://example.com",
            },
            {
              id: "pack-2",
              type: "pdf",
              title: "Teacher Notes",
              content: "base64",
            },
          ],
          createdAt: "2026-04-10T10:00:00.000Z",
          updatedAt: "2026-04-10T10:00:00.000Z",
        },
      ],
      selectedPackId: "pack-1",
    });

    expect(useWizardStore.getState().getEffectiveInspiration()).toEqual([
      expect.objectContaining({ id: "item-1" }),
      expect.objectContaining({ id: "pack-2" }),
    ]);
  });

  it("openWizardForRegeneration restores local context ids when available", async () => {
    const fetchProjectInspiration = vi.fn().mockResolvedValue([]);
    vi.mocked(useProjectStore.getState).mockReturnValue({
      projects: [],
      fetchProjectInspiration,
    } as never);
    useProjectContextStore.getState().upsertContext("project-1", {
      type: "quick_create",
      selectedInspirationIds: ["item-1"],
    });
    vi.mocked(getInspirationItems).mockResolvedValue([
      { id: "item-1", type: "url", title: "Local Example" },
    ]);

    await useWizardStore.getState().openWizardForRegeneration({
      id: "project-1",
      userId: "user-1",
      title: "Test Project",
      description: null,
      prompt: "Create a worksheet",
      grade: "2",
      subject: "Math",
      options: {},
      inspiration: [],
      outputPath: null,
      status: "completed",
      errorMessage: null,
      creditsUsed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date(),
    });

    expect(useWizardStore.getState().selectedInspirationIds).toEqual(["item-1"]);
    expect(fetchProjectInspiration).not.toHaveBeenCalled();
  });

  it("openWizardForRegeneration imports legacy project inspiration when no local context exists", async () => {
    const fetchProjectInspiration = vi.fn().mockResolvedValue([
      { id: "legacy-1", type: "url" as const, title: "Legacy Link" },
    ]);
    vi.mocked(useProjectStore.getState).mockReturnValue({
      projects: [],
      fetchProjectInspiration,
    } as never);
    vi.mocked(getInspirationItems).mockResolvedValue([]);
    vi.mocked(bulkUpsertInspirationItems).mockResolvedValue([
      { id: "canonical-1", type: "url", title: "Legacy Link" },
    ]);

    await useWizardStore.getState().openWizardForRegeneration({
      id: "project-legacy",
      userId: "user-1",
      title: "Legacy Project",
      description: null,
      prompt: "Create a worksheet",
      grade: "2",
      subject: "Math",
      options: {},
      inspiration: [],
      outputPath: null,
      status: "completed",
      errorMessage: null,
      creditsUsed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date(),
    });

    expect(fetchProjectInspiration).toHaveBeenCalledWith("project-legacy");
    expect(bulkUpsertInspirationItems).toHaveBeenCalledWith([
      { id: "legacy-1", type: "url", title: "Legacy Link" },
    ]);
    expect(useWizardStore.getState().selectedInspirationIds).toEqual(["canonical-1"]);
    expect(
      useProjectContextStore.getState().getContext("project-legacy")?.selectedInspirationIds
    ).toEqual(["canonical-1"]);
  });

  it("getProjectOptions still reflects class details for generation requests", () => {
    useWizardStore.setState({
      classDetails: {
        grade: "2",
        subject: "Math",
        format: "worksheet",
        questionCount: 12,
        includeVisuals: false,
        difficulty: "easy",
        includeAnswerKey: true,
        lessonLength: 30,
        studentProfile: [],
        teachingConfidence: "intermediate",
      },
    });

    expect(getProjectOptions(useWizardStore.getState())).toEqual({
      questionCount: 12,
      includeVisuals: false,
      difficulty: "easy",
      format: "worksheet",
      includeAnswerKey: true,
      lessonLength: 30,
      studentProfile: [],
      teachingConfidence: "intermediate",
    });
  });

  it("openWizardForRemediation seeds remediation mode and context", () => {
    useWizardStore.getState().openWizardForRemediation(
      {
        id: "math-2-1",
        text: "Add within 20",
        difficulty: "standard",
        estimatedMinutes: 20,
        unitTitle: "Math - Addition",
        whyRecommended: "Quick Check remediation",
        vocabulary: ["sum"],
        activities: ["Use counters"],
        misconceptions: ["Forgetting to carry"],
      },
      {
        learnerId: "learner-1",
        displayName: "Emma",
        grade: "2",
        avatarEmoji: "🦊",
        preferences: {
          favoriteSubjects: ["Math"],
          sessionDuration: 30,
          visualLearner: true,
        },
        adultConfidence: "novice",
        createdAt: "2026-04-10T12:00:00.000Z",
        updatedAt: "2026-04-10T12:00:00.000Z",
      },
      {
        resultId: "result-1",
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
            prompt: "Can the learner demonstrate the skill?",
            correct: false,
            note: "Still counting by ones.",
          },
        ],
        recommendation: "remediate",
        wrongAnswerSummary: "Still counting by ones.",
        createdAt: "2026-04-10T12:00:00.000Z",
      }
    );

    const state = useWizardStore.getState();
    expect(state.generationMode).toBe("remediation_pack");
    expect(state.remediationContext).toMatchObject({
      objectiveId: "math-2-1",
      score: 33,
    });
    expect(state.classDetails?.format).toBe("worksheet");
    expect(state.classDetails?.includeVisuals).toBe(false);
  });

  it("preserves remediation mode when class details or provider change", () => {
    useWizardStore.setState({
      remediationContext: {
        objectiveId: "math-2-1",
        objectiveText: "Add within 20",
        subject: "Math",
        grade: "2",
        score: 33,
        wrongAnswerSummary: "Needs more support.",
        missedCheckpoints: [{ kind: "core", prompt: "Can the learner add within 20?" }],
      },
      classDetails: {
        grade: "2",
        subject: "Math",
        format: "worksheet",
        questionCount: 5,
        includeVisuals: false,
        difficulty: "easy",
        includeAnswerKey: true,
        lessonLength: 15,
        studentProfile: [],
        teachingConfidence: "intermediate",
      },
      generationMode: "remediation_pack",
    });

    useWizardStore.getState().setClassDetails({
      grade: "2",
      subject: "Math",
      format: "both",
      questionCount: 8,
      includeVisuals: true,
      difficulty: "medium",
      includeAnswerKey: true,
      lessonLength: 30,
      studentProfile: [],
      teachingConfidence: "experienced",
    });
    useWizardStore.getState().setAiProvider("premium");

    expect(useWizardStore.getState().generationMode).toBe("remediation_pack");
  });
});

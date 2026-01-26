import { describe, it, expect, beforeEach, vi } from "vitest";
import { useLearnerStore } from "@/stores/learnerStore";
import type { LearnerProfile, LearnerMasteryData } from "@/types";

// Mock the learner-storage service
vi.mock("@/services/learner-storage", () => ({
  getLearnerProfiles: vi.fn().mockResolvedValue([]),
  createLearnerProfile: vi.fn().mockImplementation((data) =>
    Promise.resolve({
      learnerId: "test-learner-id",
      displayName: data.displayName,
      grade: data.grade,
      avatarEmoji: data.avatarEmoji || "🦁",
      preferences: {
        favoriteSubjects: data.preferences?.favoriteSubjects || [],
        sessionDuration: data.preferences?.sessionDuration || 30,
        visualLearner: data.preferences?.visualLearner ?? true,
      },
      adultConfidence: data.adultConfidence || "intermediate",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  ),
  updateLearnerProfile: vi.fn().mockImplementation((learnerId, updates) =>
    Promise.resolve({ learnerId, ...updates })
  ),
  deleteLearnerProfile: vi.fn().mockResolvedValue(undefined),
  getLearnerMastery: vi.fn().mockResolvedValue({
    learnerId: "test-learner-id",
    objectives: {},
    lastSessionDate: null,
  }),
  updateObjectiveMasteryState: vi.fn().mockResolvedValue(undefined),
  getActiveLearnerIdFromStorage: vi.fn().mockReturnValue(null),
  setActiveLearnerIdToStorage: vi.fn(),
}));

// Mock curriculum module
vi.mock("@/lib/curriculum", () => ({
  getNextRecommendedObjective: vi.fn().mockReturnValue(null),
  getAllSubjectProgress: vi.fn().mockReturnValue([]),
  getSubjectProgress: vi.fn().mockReturnValue(null),
}));

const mockLearnerProfile: LearnerProfile = {
  learnerId: "test-learner-1",
  displayName: "Test Student",
  grade: "2",
  avatarEmoji: "🦁",
  preferences: {
    favoriteSubjects: ["Math"],
    sessionDuration: 30,
    visualLearner: true,
  },
  adultConfidence: "intermediate",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockMasteryData: LearnerMasteryData = {
  learnerId: "test-learner-1",
  objectives: {
    "math_1_01": {
      objectiveId: "math_1_01",
      subject: "Math",
      state: "in_progress",
      lastScore: 70,
      attempts: 1,
      lastUpdated: new Date().toISOString(),
    },
  },
  lastSessionDate: new Date().toISOString(),
};

describe("learnerStore", () => {
  beforeEach(() => {
    // Reset store state
    useLearnerStore.setState({
      profiles: [],
      activeLearnerId: null,
      isLoading: false,
      error: null,
      masteryData: null,
      isMasteryLoading: false,
    });
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with empty profiles", () => {
      const { profiles } = useLearnerStore.getState();
      expect(profiles).toEqual([]);
    });

    it("starts with no active learner", () => {
      const { activeLearnerId } = useLearnerStore.getState();
      expect(activeLearnerId).toBeNull();
    });

    it("starts with no mastery data", () => {
      const { masteryData } = useLearnerStore.getState();
      expect(masteryData).toBeNull();
    });
  });

  describe("profile management", () => {
    it("can add a profile", () => {
      useLearnerStore.setState({
        profiles: [mockLearnerProfile],
      });

      const { profiles } = useLearnerStore.getState();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].displayName).toBe("Test Student");
    });

    it("can set active learner", () => {
      useLearnerStore.setState({
        profiles: [mockLearnerProfile],
      });

      useLearnerStore.getState().setActiveLearner("test-learner-1");

      const { activeLearnerId } = useLearnerStore.getState();
      expect(activeLearnerId).toBe("test-learner-1");
    });

    it("getActiveProfile returns the correct profile", () => {
      useLearnerStore.setState({
        profiles: [mockLearnerProfile],
        activeLearnerId: "test-learner-1",
      });

      const activeProfile = useLearnerStore.getState().getActiveProfile();
      expect(activeProfile).toEqual(mockLearnerProfile);
    });

    it("getActiveProfile returns null when no active learner", () => {
      useLearnerStore.setState({
        profiles: [mockLearnerProfile],
        activeLearnerId: null,
      });

      const activeProfile = useLearnerStore.getState().getActiveProfile();
      expect(activeProfile).toBeNull();
    });
  });

  describe("mastery tracking", () => {
    it("can set mastery data", () => {
      useLearnerStore.setState({
        masteryData: mockMasteryData,
      });

      const { masteryData } = useLearnerStore.getState();
      expect(masteryData?.objectives["math_1_01"]?.state).toBe("in_progress");
    });

    it("updateObjectiveMastery updates local state", async () => {
      useLearnerStore.setState({
        profiles: [mockLearnerProfile],
        activeLearnerId: "test-learner-1",
        masteryData: mockMasteryData,
      });

      await useLearnerStore.getState().updateObjectiveMastery(
        "math_1_02",
        "Math",
        "mastered",
        95
      );

      const { masteryData } = useLearnerStore.getState();
      expect(masteryData?.objectives["math_1_02"]?.state).toBe("mastered");
      expect(masteryData?.objectives["math_1_02"]?.lastScore).toBe(95);
    });

    it("markObjectiveStarted sets state to in_progress", async () => {
      useLearnerStore.setState({
        profiles: [mockLearnerProfile],
        activeLearnerId: "test-learner-1",
        masteryData: mockMasteryData,
      });

      await useLearnerStore.getState().markObjectiveStarted("math_1_03", "Math");

      const { masteryData } = useLearnerStore.getState();
      expect(masteryData?.objectives["math_1_03"]?.state).toBe("in_progress");
    });

    it("markObjectiveMastered sets state to mastered", async () => {
      useLearnerStore.setState({
        profiles: [mockLearnerProfile],
        activeLearnerId: "test-learner-1",
        masteryData: mockMasteryData,
      });

      await useLearnerStore.getState().markObjectiveMastered("math_1_01", "Math");

      const { masteryData } = useLearnerStore.getState();
      expect(masteryData?.objectives["math_1_01"]?.state).toBe("mastered");
    });

    it("markObjectiveNeedsReview sets state to needs_review", async () => {
      useLearnerStore.setState({
        profiles: [mockLearnerProfile],
        activeLearnerId: "test-learner-1",
        masteryData: mockMasteryData,
      });

      await useLearnerStore.getState().markObjectiveNeedsReview("math_1_01", "Math");

      const { masteryData } = useLearnerStore.getState();
      expect(masteryData?.objectives["math_1_01"]?.state).toBe("needs_review");
    });
  });

  describe("error handling", () => {
    it("can set and clear errors", () => {
      useLearnerStore.setState({
        error: "Test error",
      });

      expect(useLearnerStore.getState().error).toBe("Test error");

      useLearnerStore.getState().clearError();

      expect(useLearnerStore.getState().error).toBeNull();
    });
  });

  describe("reset", () => {
    it("resets all state to defaults", () => {
      useLearnerStore.setState({
        profiles: [mockLearnerProfile],
        activeLearnerId: "test-learner-1",
        isLoading: true,
        error: "some error",
        masteryData: mockMasteryData,
        isMasteryLoading: true,
      });

      useLearnerStore.getState().reset();

      const state = useLearnerStore.getState();
      expect(state.profiles).toEqual([]);
      expect(state.activeLearnerId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.masteryData).toBeNull();
      expect(state.isMasteryLoading).toBe(false);
    });
  });
});

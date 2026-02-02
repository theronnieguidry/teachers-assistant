import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getLearnerProfiles,
  saveLearnerProfile,
  createLearnerProfile,
  updateLearnerProfile,
  deleteLearnerProfile,
  getLearnerMastery,
  saveObjectiveMastery,
  saveLearnerMastery,
  updateObjectiveMasteryState,
  getQuickCheckHistory,
  saveQuickCheckResult,
  getActiveLearnerIdFromStorage,
  setActiveLearnerIdToStorage,
} from "@/services/learner-storage";
import type {
  LearnerProfile,
  LearnerMasteryData,
  QuickCheckResult,
} from "@/types";

// Mock tauri-bridge
vi.mock("@/services/tauri-bridge", () => ({
  isTauriContext: vi.fn(() => false),
}));

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Helper to validate UUID format
const isValidUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

describe("Learner Storage Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  describe("Profile Functions (localStorage fallback)", () => {
    const mockProfile: LearnerProfile = {
      learnerId: "learner-1",
      displayName: "Test Learner",
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

    describe("getLearnerProfiles", () => {
      it("should return empty array when no profiles exist", async () => {
        const profiles = await getLearnerProfiles();
        expect(profiles).toEqual([]);
      });

      it("should return profiles from localStorage", async () => {
        localStorage.setItem("learner-profiles", JSON.stringify([mockProfile]));

        const profiles = await getLearnerProfiles();
        expect(profiles).toHaveLength(1);
        expect(profiles[0].displayName).toBe("Test Learner");
      });
    });

    describe("saveLearnerProfile", () => {
      it("should add new profile to localStorage", async () => {
        await saveLearnerProfile(mockProfile);

        const stored = JSON.parse(localStorage.getItem("learner-profiles") || "[]");
        expect(stored).toHaveLength(1);
        expect(stored[0].learnerId).toBe("learner-1");
      });

      it("should update existing profile", async () => {
        localStorage.setItem("learner-profiles", JSON.stringify([mockProfile]));

        const updated = { ...mockProfile, displayName: "Updated Name" };
        await saveLearnerProfile(updated);

        const stored = JSON.parse(localStorage.getItem("learner-profiles") || "[]");
        expect(stored).toHaveLength(1);
        expect(stored[0].displayName).toBe("Updated Name");
      });
    });

    describe("createLearnerProfile", () => {
      it("should create profile with required fields", async () => {
        const profile = await createLearnerProfile({
          displayName: "New Learner",
          grade: "K",
        });

        expect(profile.learnerId).toBeDefined();
        expect(isValidUUID(profile.learnerId)).toBe(true);
        expect(profile.displayName).toBe("New Learner");
        expect(profile.grade).toBe("K");
        expect(profile.avatarEmoji).toBe("🦁"); // default
        expect(profile.adultConfidence).toBe("intermediate"); // default
      });

      it("should create profile with optional fields", async () => {
        const profile = await createLearnerProfile({
          displayName: "Custom Learner",
          grade: "1",
          avatarEmoji: "🦄",
          adultConfidence: "beginner",
          preferences: {
            favoriteSubjects: ["Reading", "Math"],
            sessionDuration: 45,
            visualLearner: false,
          },
        });

        expect(profile.avatarEmoji).toBe("🦄");
        expect(profile.adultConfidence).toBe("beginner");
        expect(profile.preferences.favoriteSubjects).toEqual(["Reading", "Math"]);
        expect(profile.preferences.sessionDuration).toBe(45);
        expect(profile.preferences.visualLearner).toBe(false);
      });

      it("should save profile to localStorage", async () => {
        await createLearnerProfile({
          displayName: "Saved Learner",
          grade: "3",
        });

        const profiles = await getLearnerProfiles();
        expect(profiles).toHaveLength(1);
        expect(profiles[0].displayName).toBe("Saved Learner");
      });
    });

    describe("updateLearnerProfile", () => {
      it("should update existing profile", async () => {
        localStorage.setItem("learner-profiles", JSON.stringify([mockProfile]));

        const updated = await updateLearnerProfile("learner-1", {
          displayName: "New Name",
          grade: "3",
        });

        expect(updated.displayName).toBe("New Name");
        expect(updated.grade).toBe("3");
        expect(updated.learnerId).toBe("learner-1"); // unchanged
      });

      it("should throw error if profile not found", async () => {
        await expect(
          updateLearnerProfile("nonexistent", { displayName: "Test" })
        ).rejects.toThrow("Learner profile not found: nonexistent");
      });

      it("should update updatedAt timestamp", async () => {
        localStorage.setItem("learner-profiles", JSON.stringify([mockProfile]));

        const updated = await updateLearnerProfile("learner-1", {
          displayName: "Test",
        });

        expect(updated.updatedAt).not.toBe(mockProfile.updatedAt);
      });
    });

    describe("deleteLearnerProfile", () => {
      it("should remove profile from localStorage", async () => {
        localStorage.setItem("learner-profiles", JSON.stringify([mockProfile]));

        await deleteLearnerProfile("learner-1");

        const profiles = await getLearnerProfiles();
        expect(profiles).toHaveLength(0);
      });

      it("should remove associated mastery data", async () => {
        localStorage.setItem("learner-profiles", JSON.stringify([mockProfile]));
        localStorage.setItem("learner-mastery-learner-1", "{}");
        localStorage.setItem("learner-quickchecks-learner-1", "[]");

        await deleteLearnerProfile("learner-1");

        expect(localStorage.getItem("learner-mastery-learner-1")).toBeNull();
        expect(localStorage.getItem("learner-quickchecks-learner-1")).toBeNull();
      });
    });
  });

  describe("Mastery Functions (localStorage fallback)", () => {
    const learnerId = "learner-1";

    describe("getLearnerMastery", () => {
      it("should return empty mastery data for new learner", async () => {
        const mastery = await getLearnerMastery(learnerId);

        expect(mastery.learnerId).toBe(learnerId);
        expect(mastery.objectives).toEqual({});
        expect(mastery.lastSessionDate).toBeNull();
      });

      it("should return stored mastery data", async () => {
        const mockMastery: LearnerMasteryData = {
          learnerId,
          objectives: {
            "obj-1": {
              objectiveId: "obj-1",
              subject: "Math",
              state: "introduced",
              attempts: 1,
              lastUpdated: "2024-01-15T10:00:00Z",
            },
          },
          lastSessionDate: "2024-01-15T10:00:00Z",
        };
        localStorage.setItem(
          `learner-mastery-${learnerId}`,
          JSON.stringify(mockMastery)
        );

        const mastery = await getLearnerMastery(learnerId);
        expect(mastery.objectives["obj-1"].state).toBe("introduced");
      });
    });

    describe("saveObjectiveMastery", () => {
      it("should save single objective mastery", async () => {
        await saveObjectiveMastery(learnerId, {
          objectiveId: "obj-1",
          subject: "Math",
          state: "practicing",
          attempts: 2,
          lastUpdated: "2024-01-15T10:00:00Z",
        });

        const mastery = await getLearnerMastery(learnerId);
        expect(mastery.objectives["obj-1"].state).toBe("practicing");
        expect(mastery.objectives["obj-1"].attempts).toBe(2);
      });

      it("should update lastSessionDate", async () => {
        await saveObjectiveMastery(learnerId, {
          objectiveId: "obj-1",
          subject: "Math",
          state: "mastered",
          attempts: 3,
          lastUpdated: "2024-01-15T10:00:00Z",
        });

        const mastery = await getLearnerMastery(learnerId);
        expect(mastery.lastSessionDate).not.toBeNull();
      });
    });

    describe("saveLearnerMastery", () => {
      it("should save complete mastery data", async () => {
        const masteryData: LearnerMasteryData = {
          learnerId,
          objectives: {
            "obj-1": {
              objectiveId: "obj-1",
              subject: "Math",
              state: "mastered",
              attempts: 5,
              lastUpdated: "2024-01-15T10:00:00Z",
            },
          },
          lastSessionDate: "2024-01-15T10:00:00Z",
        };

        await saveLearnerMastery(learnerId, masteryData);

        const stored = JSON.parse(
          localStorage.getItem(`learner-mastery-${learnerId}`) || "{}"
        );
        expect(stored.objectives["obj-1"].state).toBe("mastered");
      });
    });

    describe("updateObjectiveMasteryState", () => {
      it("should update objective state", async () => {
        await updateObjectiveMasteryState(
          learnerId,
          "obj-1",
          "Math",
          "introduced",
          80
        );

        const mastery = await getLearnerMastery(learnerId);
        expect(mastery.objectives["obj-1"].state).toBe("introduced");
        expect(mastery.objectives["obj-1"].lastScore).toBe(80);
      });

      it("should increment attempts when score is provided", async () => {
        await updateObjectiveMasteryState(learnerId, "obj-1", "Math", "practicing", 70);
        await updateObjectiveMasteryState(learnerId, "obj-1", "Math", "practicing", 80);

        const mastery = await getLearnerMastery(learnerId);
        expect(mastery.objectives["obj-1"].attempts).toBe(2);
      });
    });
  });

  describe("Quick Check Functions (localStorage fallback)", () => {
    const learnerId = "learner-1";

    describe("getQuickCheckHistory", () => {
      it("should return empty array for new learner", async () => {
        const history = await getQuickCheckHistory(learnerId);
        expect(history).toEqual([]);
      });

      it("should return stored history", async () => {
        const mockHistory: QuickCheckResult[] = [
          {
            resultId: "result-1",
            objectiveId: "obj-1",
            score: 80,
            totalQuestions: 5,
            correctAnswers: 4,
            passed: true,
            createdAt: "2024-01-15T10:00:00Z",
          },
        ];
        localStorage.setItem(
          `learner-quickchecks-${learnerId}`,
          JSON.stringify(mockHistory)
        );

        const history = await getQuickCheckHistory(learnerId);
        expect(history).toHaveLength(1);
        expect(history[0].score).toBe(80);
      });

      it("should filter by objectiveId when provided", async () => {
        const mockHistory: QuickCheckResult[] = [
          {
            resultId: "result-1",
            objectiveId: "obj-1",
            score: 80,
            totalQuestions: 5,
            correctAnswers: 4,
            passed: true,
            createdAt: "2024-01-15T10:00:00Z",
          },
          {
            resultId: "result-2",
            objectiveId: "obj-2",
            score: 60,
            totalQuestions: 5,
            correctAnswers: 3,
            passed: false,
            createdAt: "2024-01-15T11:00:00Z",
          },
        ];
        localStorage.setItem(
          `learner-quickchecks-${learnerId}`,
          JSON.stringify(mockHistory)
        );

        const history = await getQuickCheckHistory(learnerId, "obj-1");
        expect(history).toHaveLength(1);
        expect(history[0].objectiveId).toBe("obj-1");
      });
    });

    describe("saveQuickCheckResult", () => {
      it("should save quick check result", async () => {
        const result = await saveQuickCheckResult(learnerId, {
          objectiveId: "obj-1",
          score: 100,
          totalQuestions: 5,
          correctAnswers: 5,
          passed: true,
        });

        expect(result.resultId).toBeDefined();
        expect(isValidUUID(result.resultId)).toBe(true);
        expect(result.score).toBe(100);
        expect(result.createdAt).toBeDefined();
      });

      it("should append to existing history", async () => {
        await saveQuickCheckResult(learnerId, {
          objectiveId: "obj-1",
          score: 80,
          totalQuestions: 5,
          correctAnswers: 4,
          passed: true,
        });

        await saveQuickCheckResult(learnerId, {
          objectiveId: "obj-2",
          score: 60,
          totalQuestions: 5,
          correctAnswers: 3,
          passed: false,
        });

        const history = await getQuickCheckHistory(learnerId);
        expect(history).toHaveLength(2);
      });
    });
  });

  describe("Active Learner Functions (localStorage only)", () => {
    describe("getActiveLearnerIdFromStorage", () => {
      it("should return null when no active learner", () => {
        const id = getActiveLearnerIdFromStorage();
        expect(id).toBeNull();
      });

      it("should return stored active learner ID", () => {
        localStorage.setItem("active-learner-id", "learner-123");

        const id = getActiveLearnerIdFromStorage();
        expect(id).toBe("learner-123");
      });
    });

    describe("setActiveLearnerIdToStorage", () => {
      it("should save active learner ID", () => {
        setActiveLearnerIdToStorage("learner-456");

        expect(localStorage.getItem("active-learner-id")).toBe("learner-456");
      });

      it("should remove active learner when null", () => {
        localStorage.setItem("active-learner-id", "learner-123");

        setActiveLearnerIdToStorage(null);

        expect(localStorage.getItem("active-learner-id")).toBeNull();
      });
    });
  });
});

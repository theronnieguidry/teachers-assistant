import { describe, it, expect } from "vitest";
import {
  getAllCurriculumPacks,
  getCurriculumPack,
  getSubjects,
  getUnitsForGrade,
  getObjectivesForSubject,
  getObjectivesForGrade,
  getObjectiveById,
  getNextRecommendedObjective,
  getSubjectProgress,
  getAllSubjectProgress,
  calculateMasteryFromScore,
  getReadyToLearnObjectives,
} from "@/lib/curriculum";
import type { LearnerMasteryData } from "@/types";

describe("curriculum", () => {
  describe("getAllCurriculumPacks", () => {
    it("returns all 5 curriculum packs", () => {
      const packs = getAllCurriculumPacks();
      expect(Object.keys(packs)).toHaveLength(5);
      expect(Object.keys(packs)).toContain("Math");
      expect(Object.keys(packs)).toContain("Reading");
      expect(Object.keys(packs)).toContain("Writing");
      expect(Object.keys(packs)).toContain("Science");
      expect(Object.keys(packs)).toContain("Social Studies");
    });
  });

  describe("getCurriculumPack", () => {
    it("returns Math pack", () => {
      const pack = getCurriculumPack("Math");
      expect(pack).not.toBeNull();
      expect(pack?.subject).toBe("Math");
    });

    it("returns null for unknown subject", () => {
      const pack = getCurriculumPack("Unknown");
      expect(pack).toBeNull();
    });
  });

  describe("getSubjects", () => {
    it("returns all subject names", () => {
      const subjects = getSubjects();
      expect(subjects).toHaveLength(5);
      expect(subjects).toContain("Math");
      expect(subjects).toContain("Reading");
    });
  });

  describe("getUnitsForGrade", () => {
    it("returns units for Grade K Math", () => {
      const units = getUnitsForGrade("Math", "K");
      expect(units.length).toBeGreaterThan(0);
      units.forEach((unit) => {
        expect(unit.grade).toBe("K");
      });
    });

    it("returns empty array for grade 6 (beyond K-3)", () => {
      const units = getUnitsForGrade("Math", "6");
      expect(units).toHaveLength(0);
    });
  });

  describe("getObjectivesForSubject", () => {
    it("returns objectives for Math", () => {
      const objectives = getObjectivesForSubject("Math");
      expect(objectives.length).toBeGreaterThan(0);
      objectives.forEach((obj) => {
        expect(obj.id).toBeDefined();
        expect(obj.text).toBeDefined();
      });
    });
  });

  describe("getObjectivesForGrade", () => {
    it("returns objectives across all subjects for grade K", () => {
      const results = getObjectivesForGrade("K");
      expect(results.length).toBeGreaterThan(0);

      const subjects = new Set(results.map((r) => r.subject));
      expect(subjects.size).toBeGreaterThan(1);
    });
  });

  describe("getObjectiveById", () => {
    it("finds a Math objective by ID", () => {
      const result = getObjectiveById("math_k_01");
      expect(result).not.toBeNull();
      expect(result?.objective.text).toBe("Count objects up to 10");
      expect(result?.subject).toBe("Math");
    });

    it("returns null for unknown ID", () => {
      const result = getObjectiveById("unknown_id");
      expect(result).toBeNull();
    });
  });

  describe("getNextRecommendedObjective", () => {
    it("recommends an objective for new learner (no mastery)", () => {
      const recommendation = getNextRecommendedObjective("K", null);
      expect(recommendation).not.toBeNull();
      expect(recommendation?.masteryState).toBe("not_started");
    });

    it("prioritizes needs_review objectives", () => {
      const masteryData: LearnerMasteryData = {
        learnerId: "test",
        objectives: {
          "math_k_01": {
            objectiveId: "math_k_01",
            subject: "Math",
            state: "needs_review",
            lastScore: 40,
            attempts: 1,
            lastUpdated: new Date().toISOString(),
          },
        },
        lastSessionDate: null,
      };

      const recommendation = getNextRecommendedObjective("K", masteryData);
      expect(recommendation).not.toBeNull();
      expect(recommendation?.masteryState).toBe("needs_review");
    });

    it("continues in_progress objectives", () => {
      const masteryData: LearnerMasteryData = {
        learnerId: "test",
        objectives: {
          "math_k_01": {
            objectiveId: "math_k_01",
            subject: "Math",
            state: "in_progress",
            lastScore: 60,
            attempts: 1,
            lastUpdated: new Date().toISOString(),
          },
        },
        lastSessionDate: null,
      };

      const recommendation = getNextRecommendedObjective("K", masteryData);
      expect(recommendation?.masteryState).toBe("in_progress");
    });

    it("prefers specified subject", () => {
      const recommendation = getNextRecommendedObjective("K", null, "Reading");
      expect(recommendation?.subject).toBe("Reading");
    });
  });

  describe("getSubjectProgress", () => {
    it("returns progress for Math grade K", () => {
      const progress = getSubjectProgress("Math", "K", null);
      expect(progress.subject).toBe("Math");
      expect(progress.totalObjectives).toBeGreaterThan(0);
      expect(progress.notStarted).toBe(progress.totalObjectives);
      expect(progress.mastered).toBe(0);
      expect(progress.percentComplete).toBe(0);
    });

    it("calculates percent complete correctly", () => {
      const units = getUnitsForGrade("Math", "K");
      const objectives = units.flatMap((u) => u.objectives);
      const firstObjId = objectives[0]?.id;

      if (firstObjId) {
        const masteryData: LearnerMasteryData = {
          learnerId: "test",
          objectives: {
            [firstObjId]: {
              objectiveId: firstObjId,
              subject: "Math",
              state: "mastered",
              lastScore: 90,
              attempts: 1,
              lastUpdated: new Date().toISOString(),
            },
          },
          lastSessionDate: null,
        };

        const progress = getSubjectProgress("Math", "K", masteryData);
        expect(progress.mastered).toBe(1);
        expect(progress.percentComplete).toBeGreaterThan(0);
      }
    });
  });

  describe("getAllSubjectProgress", () => {
    it("returns progress for all subjects", () => {
      const allProgress = getAllSubjectProgress("K", null);
      expect(allProgress).toHaveLength(5);
      expect(allProgress.map((p) => p.subject)).toContain("Math");
      expect(allProgress.map((p) => p.subject)).toContain("Reading");
    });
  });

  describe("calculateMasteryFromScore", () => {
    it("returns mastered for 80+", () => {
      expect(calculateMasteryFromScore(80)).toBe("mastered");
      expect(calculateMasteryFromScore(100)).toBe("mastered");
    });

    it("returns in_progress for 50-79", () => {
      expect(calculateMasteryFromScore(50)).toBe("in_progress");
      expect(calculateMasteryFromScore(79)).toBe("in_progress");
    });

    it("returns needs_review for below 50", () => {
      expect(calculateMasteryFromScore(49)).toBe("needs_review");
      expect(calculateMasteryFromScore(0)).toBe("needs_review");
    });
  });

  describe("getReadyToLearnObjectives", () => {
    it("returns objectives with met prerequisites for new learner", () => {
      const ready = getReadyToLearnObjectives("K", null);
      expect(ready.length).toBeGreaterThan(0);

      // All should have empty prereqs (ready for beginners)
      ready.forEach((r) => {
        expect(
          r.objective.prereqs.length === 0 ||
          r.objective.prereqs.every((p) => false) // or mastered prereqs
        ).toBe(true);
      });
    });
  });
});

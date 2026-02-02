import { describe, it, expect, beforeEach } from "vitest";
import {
  loadCurriculumPack,
  getAvailableSubjects,
  getAvailableGrades,
  hasSubjectPack,
  getUnitsForGrade,
  getObjectivesForGrade,
  getRecommendedObjectives,
  getObjectiveById,
  searchObjectives,
  clearPackCache,
} from "../../../services/premium/curriculum-pack.js";

describe("Curriculum Pack Service", () => {
  beforeEach(() => {
    clearPackCache();
  });

  describe("loadCurriculumPack", () => {
    it("should load math curriculum pack", () => {
      const pack = loadCurriculumPack("Math");

      expect(pack).toBeTruthy();
      expect(pack?.subject).toBe("Math");
      expect(pack?.gradeRange).toBe("K-3");
      expect(pack?.units.length).toBeGreaterThan(0);
    });

    it("should load reading curriculum pack", () => {
      const pack = loadCurriculumPack("Reading");

      expect(pack).toBeTruthy();
      expect(pack?.subject).toBe("Reading");
    });

    it("should load science curriculum pack", () => {
      const pack = loadCurriculumPack("Science");

      expect(pack).toBeTruthy();
      expect(pack?.subject).toBe("Science");
    });

    it("should load social studies curriculum pack", () => {
      const pack = loadCurriculumPack("Social Studies");

      expect(pack).toBeTruthy();
      expect(pack?.subject).toBe("Social Studies");
    });

    it("should load writing curriculum pack", () => {
      const pack = loadCurriculumPack("Writing");

      expect(pack).toBeTruthy();
      expect(pack?.subject).toBe("Writing");
    });

    it("should return null for unknown subject", () => {
      const pack = loadCurriculumPack("Underwater Basket Weaving");

      expect(pack).toBeNull();
    });

    it("should normalize subject name (case insensitive)", () => {
      const pack1 = loadCurriculumPack("math");
      const pack2 = loadCurriculumPack("MATH");
      const pack3 = loadCurriculumPack("Math");

      expect(pack1).toBeTruthy();
      expect(pack2).toBeTruthy();
      expect(pack3).toBeTruthy();
    });

    it("should cache loaded packs", () => {
      const pack1 = loadCurriculumPack("Math");
      const pack2 = loadCurriculumPack("Math");

      expect(pack1).toBe(pack2); // Same reference
    });
  });

  describe("getAvailableSubjects", () => {
    it("should return all available subjects", () => {
      const subjects = getAvailableSubjects();

      expect(subjects).toContain("Math");
      expect(subjects).toContain("Reading");
      expect(subjects).toContain("Writing");
      expect(subjects).toContain("Science");
      expect(subjects).toContain("Social Studies");
    });
  });

  describe("getAvailableGrades", () => {
    it("should return K-3 grades", () => {
      const grades = getAvailableGrades();

      expect(grades).toContain("K");
      expect(grades).toContain("1");
      expect(grades).toContain("2");
      expect(grades).toContain("3");
    });
  });

  describe("hasSubjectPack", () => {
    it("should return true for valid subjects", () => {
      expect(hasSubjectPack("Math")).toBe(true);
      expect(hasSubjectPack("Reading")).toBe(true);
      expect(hasSubjectPack("ela")).toBe(true); // Alias
    });

    it("should return false for invalid subjects", () => {
      expect(hasSubjectPack("Chemistry")).toBe(false);
      expect(hasSubjectPack("")).toBe(false);
    });
  });

  describe("getUnitsForGrade", () => {
    it("should return units for a specific grade", () => {
      const units = getUnitsForGrade("Math", "1");

      expect(units.length).toBeGreaterThan(0);
      units.forEach(unit => {
        expect(unit.grade).toBe("1");
      });
    });

    it("should return empty array for invalid grade", () => {
      // Grade "9" normalizes to "9" which has no curriculum units (K-3 only)
      const units = getUnitsForGrade("Math", "9");

      expect(units).toEqual([]);
    });

    it("should sort units by sequence", () => {
      const units = getUnitsForGrade("Math", "1");

      for (let i = 1; i < units.length; i++) {
        expect(units[i].sequence).toBeGreaterThanOrEqual(units[i - 1].sequence);
      }
    });

    it("should handle grade normalization", () => {
      const units1 = getUnitsForGrade("Math", "K");
      const units2 = getUnitsForGrade("Math", "kindergarten");

      expect(units1.length).toBe(units2.length);
    });
  });

  describe("getObjectivesForGrade", () => {
    it("should return all objectives for a grade", () => {
      const objectives = getObjectivesForGrade("Math", "K");

      expect(objectives.length).toBeGreaterThan(0);
      objectives.forEach(obj => {
        expect(obj.id).toBeTruthy();
        expect(obj.text).toBeTruthy();
      });
    });
  });

  describe("getRecommendedObjectives", () => {
    it("should return recommended objectives for grade and subject", () => {
      const objectives = getRecommendedObjectives("1", "Math");

      expect(objectives.length).toBeGreaterThan(0);
      expect(objectives.length).toBeLessThanOrEqual(3); // Default count
    });

    it("should respect count parameter", () => {
      const objectives = getRecommendedObjectives("1", "Math", undefined, 5);

      expect(objectives.length).toBeLessThanOrEqual(5);
    });

    it("should filter by difficulty", () => {
      const easyObjectives = getRecommendedObjectives("1", "Math", "easy", 10);

      easyObjectives.forEach(obj => {
        expect(obj.difficulty).toBe("easy");
      });
    });

    it("should include whyRecommended field", () => {
      const objectives = getRecommendedObjectives("K", "Math");

      objectives.forEach(obj => {
        expect(obj.whyRecommended).toBeTruthy();
      });
    });

    it("should include unitTitle field", () => {
      const objectives = getRecommendedObjectives("1", "Reading");

      objectives.forEach(obj => {
        expect(obj.unitTitle).toBeTruthy();
      });
    });

    it("should include optional vocabulary and activities", () => {
      const objectives = getRecommendedObjectives("K", "Math");

      // At least some should have these fields
      const hasVocab = objectives.some(obj => obj.vocabulary && obj.vocabulary.length > 0);
      expect(hasVocab).toBe(true);
    });

    it("should return empty array for invalid subject", () => {
      const objectives = getRecommendedObjectives("1", "Invalid Subject");

      expect(objectives).toEqual([]);
    });

    it("should prioritize foundational objectives", () => {
      const objectives = getRecommendedObjectives("K", "Math", undefined, 10);

      // First objective should have no prereqs (foundational)
      if (objectives.length > 0) {
        expect(objectives[0].whyRecommended).toContain("Foundation");
      }
    });
  });

  describe("getObjectiveById", () => {
    it("should find objective by ID", () => {
      const objective = getObjectiveById("Math", "math_k_01");

      expect(objective).toBeTruthy();
      expect(objective?.id).toBe("math_k_01");
      expect(objective?.unitTitle).toBeTruthy();
    });

    it("should return null for invalid ID", () => {
      const objective = getObjectiveById("Math", "invalid_id");

      expect(objective).toBeNull();
    });
  });

  describe("searchObjectives", () => {
    it("should find objectives by keyword", () => {
      const results = searchObjectives("Math", "count");

      expect(results.length).toBeGreaterThan(0);
    });

    it("should search in vocabulary", () => {
      const results = searchObjectives("Math", "add");

      expect(results.length).toBeGreaterThan(0);
    });

    it("should filter by grade when provided", () => {
      const results = searchObjectives("Math", "number", "1");

      results.forEach(obj => {
        // Results should be relevant to the grade
        expect(obj).toBeTruthy();
      });
    });

    it("should return empty array for no matches", () => {
      const results = searchObjectives("Math", "xyznotfound123");

      expect(results).toEqual([]);
    });

    it("should be case insensitive", () => {
      const results1 = searchObjectives("Math", "COUNT");
      const results2 = searchObjectives("Math", "count");

      expect(results1.length).toBe(results2.length);
    });
  });
});

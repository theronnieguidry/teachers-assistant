import { describe, it, expect } from "vitest";
import {
  gradeToGradeBand,
  mapLegacyArtifactType,
  getArtifactTypeLabel,
  getProjectTypeLabel,
  parseObjectiveId,
} from "@/types/artifacts";

describe("artifacts types", () => {
  describe("gradeToGradeBand", () => {
    it("returns K for kindergarten", () => {
      expect(gradeToGradeBand("K")).toBe("K");
    });

    it("returns grade as-is for grades 1-3", () => {
      expect(gradeToGradeBand("1")).toBe("1");
      expect(gradeToGradeBand("2")).toBe("2");
      expect(gradeToGradeBand("3")).toBe("3");
    });

    it("returns 4-6 for grades 4-6", () => {
      expect(gradeToGradeBand("4")).toBe("4-6");
      expect(gradeToGradeBand("5")).toBe("4-6");
      expect(gradeToGradeBand("6")).toBe("4-6");
    });
  });

  describe("mapLegacyArtifactType", () => {
    it("maps worksheet to student_page", () => {
      expect(mapLegacyArtifactType("worksheet")).toBe("student_page");
    });

    it("maps student_activity to student_page", () => {
      expect(mapLegacyArtifactType("student_activity")).toBe("student_page");
    });

    it("maps lesson_plan to lesson_plan", () => {
      expect(mapLegacyArtifactType("lesson_plan")).toBe("lesson_plan");
    });

    it("maps answer_key to answer_key", () => {
      expect(mapLegacyArtifactType("answer_key")).toBe("answer_key");
    });

    it("maps teacher_script to teacher_script", () => {
      expect(mapLegacyArtifactType("teacher_script")).toBe("teacher_script");
    });

    it("defaults to student_page for unknown types", () => {
      expect(mapLegacyArtifactType("unknown")).toBe("student_page");
    });
  });

  describe("getArtifactTypeLabel", () => {
    it("returns correct labels", () => {
      expect(getArtifactTypeLabel("student_page")).toBe("Student Page");
      expect(getArtifactTypeLabel("teacher_script")).toBe("Teacher Script");
      expect(getArtifactTypeLabel("answer_key")).toBe("Answer Key");
      expect(getArtifactTypeLabel("lesson_plan")).toBe("Lesson Plan");
      expect(getArtifactTypeLabel("print_pack")).toBe("Print Pack");
    });
  });

  describe("getProjectTypeLabel", () => {
    it("returns correct labels", () => {
      expect(getProjectTypeLabel("learning_path")).toBe("Learning Path");
      expect(getProjectTypeLabel("quick_create")).toBe("Quick Create");
    });
  });

  describe("parseObjectiveId", () => {
    it("parses valid objective IDs", () => {
      const result = parseObjectiveId("K.MATH.COUNT.1_20");
      expect(result).toEqual({
        grade: "K",
        subject: "MATH",
        domain: "COUNT",
        specific: "1_20",
      });
    });

    it("handles complex objective IDs", () => {
      const result = parseObjectiveId("2.READING.COMPREH.MAIN_IDEA");
      expect(result).toEqual({
        grade: "2",
        subject: "READING",
        domain: "COMPREH",
        specific: "MAIN_IDEA",
      });
    });

    it("returns null for invalid objective IDs", () => {
      expect(parseObjectiveId("invalid")).toBeNull();
      expect(parseObjectiveId("K.MATH")).toBeNull();
    });

    it("handles objective IDs without specific part", () => {
      const result = parseObjectiveId("K.MATH.COUNT");
      expect(result).toEqual({
        grade: "K",
        subject: "MATH",
        domain: "COUNT",
        specific: "",
      });
    });
  });
});

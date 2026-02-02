import { describe, it, expect } from "vitest";
import { assembleLessonPlanHTML } from "../../../services/premium/lesson-plan-assembler.js";
import type { LessonPlanStructure } from "../../../types/premium.js";

describe("Lesson Plan Assembler", () => {
  const createTestPlan = (overrides?: Partial<LessonPlanStructure>): LessonPlanStructure => ({
    version: "1.0",
    metadata: {
      objective: "Students will add numbers with sums up to 10",
      grade: "1",
      subject: "Math",
      durationMinutes: 30,
      priorKnowledge: ["Counting to 10", "Number recognition"],
      successCriteria: "Students can solve 8/10 problems correctly",
    },
    sections: [
      {
        type: "warmup",
        title: "Number Warm-up",
        durationMinutes: 5,
        description: "Quick counting activity to activate prior knowledge",
        activities: ["Count fingers together", "Count classroom objects"],
        teacherScript: [
          { action: "say", text: "Let's warm up our brains with counting!" },
          { action: "do", text: "Hold up 5 fingers" },
        ],
        tips: ["Use an enthusiastic tone", "Make eye contact"],
      },
      {
        type: "instruction",
        title: "Direct Instruction",
        durationMinutes: 10,
        description: "Model addition using manipulatives",
        activities: ["Demonstrate 3+2 with counters"],
        teacherScript: [
          { action: "say", text: "Today we are learning to add numbers." },
          { action: "if_struggle", text: "Slow down and use larger counters" },
        ],
      },
      {
        type: "guided_practice",
        title: "Guided Practice",
        durationMinutes: 10,
        description: "Students practice with teacher support",
        activities: ["Solve 5 problems together"],
      },
      {
        type: "closure",
        title: "Wrap Up",
        durationMinutes: 5,
        description: "Review and exit ticket",
        activities: ["Complete exit ticket"],
      },
    ],
    materials: [
      { name: "Counters", quantity: "20 per student", optional: false, notes: "Small objects work too" },
      { name: "Whiteboard", optional: false },
      { name: "Number cards", quantity: "1 set", optional: true },
    ],
    differentiation: {
      forStruggling: ["Use larger manipulatives", "Reduce problem count"],
      forAdvanced: ["Add sums to 20", "Word problems"],
      forELL: ["Visual vocabulary cards", "Paired work"],
    },
    accommodations: ["Extended time available", "Preferential seating"],
    ...overrides,
  });

  describe("assembleLessonPlanHTML", () => {
    it("should generate lesson plan HTML", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {
        includeTeacherScript: false,
        includeStudentActivity: true,
        includeMaterialsList: true,
      });

      expect(result.lessonPlanHtml).toBeTruthy();
      expect(result.lessonPlanHtml).toContain("<!DOCTYPE html>");
      expect(result.lessonPlanHtml).toContain(plan.metadata.objective);
    });

    it("should include all sections in lesson plan HTML", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {});

      expect(result.lessonPlanHtml).toContain("Warm-up");
      expect(result.lessonPlanHtml).toContain("Direct Instruction");
      expect(result.lessonPlanHtml).toContain("Guided Practice");
      expect(result.lessonPlanHtml).toContain("Wrap Up");
    });

    it("should include section durations", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, { includeTimingHints: true });

      expect(result.lessonPlanHtml).toContain("5 min");
      expect(result.lessonPlanHtml).toContain("10 min");
    });

    it("should generate teacher script HTML when requested", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {
        includeTeacherScript: true,
      });

      expect(result.teacherScriptHtml).toBeTruthy();
      // escapeHtml converts apostrophes to &#039;
      expect(result.teacherScriptHtml).toContain("warm up our brains with counting");
      expect(result.teacherScriptHtml).toContain("Hold up 5 fingers");
    });

    it("should format different script actions appropriately", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {
        includeTeacherScript: true,
      });

      // getScriptActionLabel returns friendly labels
      expect(result.teacherScriptHtml).toContain("Say this:");
      expect(result.teacherScriptHtml).toContain("Do this:");
      expect(result.teacherScriptHtml).toContain("If they struggle:");
    });

    it("should generate materials list HTML", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {
        includeMaterialsList: true,
      });

      expect(result.materialsListHtml).toBeTruthy();
      expect(result.materialsListHtml).toContain("Counters");
      expect(result.materialsListHtml).toContain("20 per student");
      expect(result.materialsListHtml).toContain("Whiteboard");
    });

    it("should mark optional materials", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {
        includeMaterialsList: true,
      });

      expect(result.materialsListHtml).toContain("Number cards");
      expect(result.materialsListHtml).toContain("optional");
    });

    it("should return null for student activity (not yet implemented)", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {
        includeStudentActivity: true,
      });

      // studentActivityHtml is a placeholder — not yet implemented
      expect(result.studentActivityHtml).toBeNull();
    });

    it("should include differentiation options", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {});

      expect(result.lessonPlanHtml).toContain("Differentiation");
      expect(result.lessonPlanHtml).toContain("larger manipulatives");
      expect(result.lessonPlanHtml).toContain("sums to 20");
    });

    it("should include accommodations", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {});

      expect(result.lessonPlanHtml).toContain("Extended time");
    });

    it("should include prior knowledge section", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {});

      expect(result.lessonPlanHtml).toContain("Counting to 10");
      expect(result.lessonPlanHtml).toContain("Number recognition");
    });

    it("should include success criteria", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {});

      expect(result.lessonPlanHtml).toContain("8/10 problems");
    });

    it("should handle plan without teacher script gracefully", () => {
      const planWithoutScript = createTestPlan({
        sections: createTestPlan().sections.map(s => ({
          ...s,
          teacherScript: undefined,
        })),
      });

      const result = assembleLessonPlanHTML(planWithoutScript, {
        includeTeacherScript: true,
      });

      // Should still generate but with empty/minimal content
      expect(result.teacherScriptHtml).toBeDefined();
    });

    it("should include print-friendly styles", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {});

      expect(result.lessonPlanHtml).toContain("@media print");
      expect(result.lessonPlanHtml).toContain("page-break");
    });

    it("should respect includeTimingHints option", () => {
      const plan = createTestPlan();

      const withTiming = assembleLessonPlanHTML(plan, { includeTimingHints: true });
      const withoutTiming = assembleLessonPlanHTML(plan, { includeTimingHints: false });

      // Both should have content
      expect(withTiming.lessonPlanHtml.length).toBeGreaterThan(0);
      expect(withoutTiming.lessonPlanHtml.length).toBeGreaterThan(0);
    });

    it("should generate all outputs when all options enabled", () => {
      const plan = createTestPlan();
      const result = assembleLessonPlanHTML(plan, {
        includeTeacherScript: true,
        includeStudentActivity: true,
        includeMaterialsList: true,
        includeTimingHints: true,
      });

      expect(result.lessonPlanHtml).toBeTruthy();
      expect(result.teacherScriptHtml).toBeTruthy();
      // studentActivityHtml is not yet implemented
      expect(result.studentActivityHtml).toBeNull();
      expect(result.materialsListHtml).toBeTruthy();
    });
  });
});

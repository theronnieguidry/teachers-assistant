import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateLessonPlan,
  validateAndRepairLessonPlan,
} from "../../../services/premium/lesson-plan-validator.js";
import type { LessonPlanStructure, LessonPlanRequirements } from "../../../types/premium.js";
import type { AIProviderConfig } from "../../../services/ai-provider.js";

// Mock the AI provider
vi.mock("../../../services/ai-provider.js", () => ({
  generateContent: vi.fn(),
}));

import { generateContent } from "../../../services/ai-provider.js";

describe("Lesson Plan Validator", () => {
  const mockAiConfig: AIProviderConfig = {
    provider: "openai",
    model: "gpt-4",
    maxTokens: 4096,
  };

  const createValidPlan = (overrides?: Partial<LessonPlanStructure>): LessonPlanStructure => ({
    version: "1.0",
    metadata: {
      objective: "Students will learn addition with sums up to 10",
      grade: "1",
      subject: "Math",
      durationMinutes: 30,
      priorKnowledge: ["Counting to 10"],
      successCriteria: "Students can solve problems correctly",
    },
    sections: [
      {
        type: "warmup",
        title: "Warm-up Activity",
        durationMinutes: 3,
        description: "Quick counting activity",
        activities: ["Count objects together"],
      },
      {
        type: "instruction",
        title: "Direct Instruction",
        durationMinutes: 7,
        description: "Model addition",
        activities: ["Demonstrate with counters"],
      },
      {
        type: "guided_practice",
        title: "Guided Practice",
        durationMinutes: 7,
        description: "Practice together",
        activities: ["Solve problems as class"],
      },
      {
        type: "independent_practice",
        title: "Independent Practice",
        durationMinutes: 10,
        description: "Students work alone",
        activities: ["Complete worksheet"],
      },
      {
        type: "closure",
        title: "Closure",
        durationMinutes: 3,
        description: "Wrap up",
        activities: ["Exit ticket"],
      },
    ],
    materials: [
      { name: "Counters", quantity: "20", optional: false },
      { name: "Whiteboard", optional: false },
    ],
    differentiation: {
      forStruggling: ["Use fewer numbers"],
      forAdvanced: ["Try harder problems"],
      forELL: ["Visual support"],
    },
    accommodations: ["Extended time"],
    ...overrides,
  });

  const defaultRequirements: LessonPlanRequirements = {
    lessonLength: 30,
    grade: "1",
    subject: "Math",
    teachingConfidence: "intermediate",
    studentProfile: [],
    includeTeacherScript: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateLessonPlan", () => {
    it("should pass validation for a valid plan", async () => {
      const plan = createValidPlan();
      const result = await validateLessonPlan(plan, defaultRequirements);

      expect(result.valid).toBe(true);
      expect(result.issues.filter(i => i.severity === "error")).toHaveLength(0);
    });

    it("should fail when objective is missing", async () => {
      const plan = createValidPlan({
        metadata: {
          ...createValidPlan().metadata,
          objective: "",
        },
      });

      const result = await validateLessonPlan(plan, defaultRequirements);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.field === "metadata.objective")).toBe(true);
    });

    it("should fail when required sections are missing", async () => {
      const plan = createValidPlan({
        sections: [
          {
            type: "warmup",
            title: "Warm-up",
            durationMinutes: 5,
            description: "Quick activity",
            activities: ["Count"],
          },
        ],
      });

      const result = await validateLessonPlan(plan, defaultRequirements);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.message.includes("Missing required section"))).toBe(true);
    });

    it("should warn when total duration exceeds lesson length", async () => {
      const plan = createValidPlan({
        sections: createValidPlan().sections.map(s => ({
          ...s,
          durationMinutes: 20, // 100 total for 5 sections
        })),
      });

      const requirements = { ...defaultRequirements, lessonLength: 30 };
      const result = await validateLessonPlan(plan, requirements);

      // Timing issues are warnings, not errors
      expect(result.issues.some(i => i.field === "sections" && i.message.includes("exceeds"))).toBe(true);
    });

    it("should allow timing within tolerance", async () => {
      const plan = createValidPlan();
      // Total is 30 min, lesson is 30 min — should pass
      const result = await validateLessonPlan(plan, defaultRequirements);

      expect(result.valid).toBe(true);
    });

    it("should fail when materials list is empty", async () => {
      const plan = createValidPlan({
        materials: [],
      });

      const result = await validateLessonPlan(plan, defaultRequirements);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.field === "materials")).toBe(true);
    });

    it("should fail when teacher script is required but missing", async () => {
      const plan = createValidPlan();

      const requirements = { ...defaultRequirements, includeTeacherScript: true };
      const result = await validateLessonPlan(plan, requirements);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.field.includes("teacherScript"))).toBe(true);
    });

    it("should pass when teacher script is present", async () => {
      const planWithScript = createValidPlan({
        sections: createValidPlan().sections.map(s => ({
          ...s,
          teacherScript: [
            { action: "say" as const, text: "Let's begin!" },
          ],
        })),
      });

      const requirements = { ...defaultRequirements, includeTeacherScript: true };
      const result = await validateLessonPlan(planWithScript, requirements);

      expect(result.issues.filter(i => i.field.includes("teacherScript") && i.severity === "error")).toHaveLength(0);
    });

    it("should warn when differentiation entries are empty", async () => {
      const plan = createValidPlan({
        differentiation: {
          forStruggling: [],
          forAdvanced: [],
          forELL: [],
        },
      });

      const result = await validateLessonPlan(plan, defaultRequirements);

      // Differentiation issues are warnings, not errors
      expect(result.issues.some(i => i.field.includes("differentiation"))).toBe(true);
    });

    it("should mark plan as auto-repairable when errors are few", async () => {
      const plan = createValidPlan({
        materials: [],
      });

      const result = await validateLessonPlan(plan, defaultRequirements);

      // 1 error (empty materials) — auto-repairable threshold is <= 3
      expect(result.autoRepairable).toBe(true);
    });
  });

  describe("validateAndRepairLessonPlan", () => {
    it("should return valid plan without repair when already valid", async () => {
      const plan = createValidPlan();
      const { plan: resultPlan, validationResult, wasRepaired } = await validateAndRepairLessonPlan(
        plan,
        defaultRequirements,
        mockAiConfig
      );

      expect(validationResult.valid).toBe(true);
      expect(wasRepaired).toBe(false);
      expect(resultPlan).toEqual(plan);
    });

    it("should attempt repair for auto-repairable issues", async () => {
      const planWithIssues = createValidPlan({
        materials: [],
      });

      const repairedPlan = createValidPlan();

      vi.mocked(generateContent).mockResolvedValue({
        content: JSON.stringify(repairedPlan),
        inputTokens: 500,
        outputTokens: 800,
      });

      const { plan: resultPlan, wasRepaired } = await validateAndRepairLessonPlan(
        planWithIssues,
        defaultRequirements,
        mockAiConfig
      );

      expect(wasRepaired).toBe(true);
      expect(resultPlan.materials.length).toBeGreaterThan(0);
    });

    it("should not attempt repair when there are too many errors", async () => {
      // Plan with >3 errors → not auto-repairable
      const plan = createValidPlan({
        metadata: {
          ...createValidPlan().metadata,
          objective: "",
        },
        materials: [],
        sections: [
          {
            type: "warmup",
            title: "",
            durationMinutes: 5,
            description: "Test",
            activities: [],
          },
        ],
      });

      const { validationResult, wasRepaired } = await validateAndRepairLessonPlan(
        plan,
        defaultRequirements,
        mockAiConfig
      );

      expect(wasRepaired).toBe(false);
      expect(validationResult.valid).toBe(false);
    });

    it("should call AI for repair when issues are auto-repairable", async () => {
      const planWithIssues = createValidPlan({
        materials: [],
      });

      const repairedPlan = createValidPlan();
      vi.mocked(generateContent).mockResolvedValue({
        content: JSON.stringify(repairedPlan),
        inputTokens: 500,
        outputTokens: 800,
      });

      await validateAndRepairLessonPlan(
        planWithIssues,
        defaultRequirements,
        mockAiConfig
      );

      expect(generateContent).toHaveBeenCalled();
    });
  });
});

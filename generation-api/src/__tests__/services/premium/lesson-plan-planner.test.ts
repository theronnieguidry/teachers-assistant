import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLessonPlan, createFallbackLessonPlan } from "../../../services/premium/lesson-plan-planner.js";
import type { LessonPlanContext } from "../../../types/premium.js";
import type { AIProviderConfig } from "../../../services/ai-provider.js";

// Mock the AI provider
vi.mock("../../../services/ai-provider.js", () => ({
  generateContent: vi.fn(),
}));

import { generateContent } from "../../../services/ai-provider.js";

describe("Lesson Plan Planner", () => {
  const mockAiConfig: AIProviderConfig = {
    provider: "openai",
    model: "gpt-4",
    maxTokens: 4096,
  };

  const createTestContext = (overrides?: Partial<LessonPlanContext>): LessonPlanContext => ({
    projectId: "test-project-123",
    userId: "test-user-456",
    prompt: "Teach addition with sums up to 10",
    grade: "1",
    subject: "Math",
    options: {},
    visualSettings: { includeVisuals: false, richness: "minimal", style: "friendly_cartoon" },
    lessonLength: 30,
    studentProfile: [],
    teachingConfidence: "intermediate",
    ...overrides,
  });

  const mockValidLessonPlanJson = {
    version: "1.0",
    metadata: {
      objective: "Students will add numbers with sums up to 10",
      grade: "1",
      subject: "Math",
      durationMinutes: 30,
      priorKnowledge: ["Counting to 10"],
      successCriteria: "Students can solve 8 out of 10 addition problems correctly",
    },
    sections: [
      {
        type: "warmup",
        title: "Number Warm-up",
        durationMinutes: 5,
        description: "Count objects to activate prior knowledge",
        activities: ["Count fingers"],
      },
      {
        type: "instruction",
        title: "Direct Instruction",
        durationMinutes: 10,
        description: "Model addition with manipulatives",
        activities: ["Show addition with counters"],
      },
      {
        type: "guided_practice",
        title: "Guided Practice",
        durationMinutes: 10,
        description: "Practice together",
        activities: ["Solve problems as a class"],
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
        title: "Wrap Up",
        durationMinutes: 5,
        description: "Review what we learned",
        activities: ["Exit ticket"],
      },
    ],
    materials: [
      { name: "Counters", quantity: "20 per student", optional: false },
    ],
    differentiation: {
      forStruggling: ["Use larger manipulatives"],
      forAdvanced: ["Try sums to 20"],
      forELL: ["Visual vocabulary cards"],
    },
    accommodations: ["Extended time available"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createLessonPlan", () => {
    it("should create a lesson plan from AI response", async () => {
      vi.mocked(generateContent).mockResolvedValue({
        content: JSON.stringify(mockValidLessonPlanJson),
        inputTokens: 500,
        outputTokens: 800,
      });

      const context = createTestContext();
      const result = await createLessonPlan(context, mockAiConfig);

      expect(result.plan).toBeDefined();
      expect(result.plan.version).toBe("1.0");
      expect(result.plan.metadata.objective).toBeTruthy();
      expect(result.plan.sections.length).toBeGreaterThan(0);
      expect(result.inputTokens).toBe(500);
    });

    it("should parse JSON from markdown code block", async () => {
      vi.mocked(generateContent).mockResolvedValue({
        content: "```json\n" + JSON.stringify(mockValidLessonPlanJson) + "\n```",
        inputTokens: 500,
        outputTokens: 800,
      });

      const context = createTestContext();
      const result = await createLessonPlan(context, mockAiConfig);

      expect(result.plan.version).toBe("1.0");
    });

    it("should include teacher script for novice confidence level", async () => {
      const planWithScript = {
        ...mockValidLessonPlanJson,
        sections: mockValidLessonPlanJson.sections.map(s => ({
          ...s,
          teacherScript: [
            { action: "say", text: "Let's learn about addition!" },
          ],
        })),
      };

      vi.mocked(generateContent).mockResolvedValue({
        content: JSON.stringify(planWithScript),
        inputTokens: 600,
        outputTokens: 1000,
      });

      const context = createTestContext({ teachingConfidence: "novice" });
      const result = await createLessonPlan(context, mockAiConfig);

      // Check that prompt was built correctly for novice mode
      expect(generateContent).toHaveBeenCalled();
      const callArg = vi.mocked(generateContent).mock.calls[0][0];
      expect(callArg).toContain("novice");
    });

    it("should handle different lesson lengths", async () => {
      vi.mocked(generateContent).mockResolvedValue({
        content: JSON.stringify(mockValidLessonPlanJson),
        inputTokens: 500,
        outputTokens: 800,
      });

      const context = createTestContext({ lessonLength: 45 });
      await createLessonPlan(context, mockAiConfig);

      const callArg = vi.mocked(generateContent).mock.calls[0][0];
      expect(callArg).toContain("45");
    });

    it("should include student profile in prompt", async () => {
      vi.mocked(generateContent).mockResolvedValue({
        content: JSON.stringify(mockValidLessonPlanJson),
        inputTokens: 500,
        outputTokens: 800,
      });

      const context = createTestContext({
        studentProfile: ["needs_movement", "ell"],
      });
      await createLessonPlan(context, mockAiConfig);

      const callArg = vi.mocked(generateContent).mock.calls[0][0];
      expect(callArg).toContain("movement");
    });

    it("should throw on JSON parse error", async () => {
      vi.mocked(generateContent).mockResolvedValue({
        content: "This is not valid JSON at all",
        inputTokens: 500,
        outputTokens: 100,
      });

      const context = createTestContext();
      await expect(createLessonPlan(context, mockAiConfig)).rejects.toThrow(
        "Failed to parse"
      );
    });
  });

  describe("createFallbackLessonPlan", () => {
    it("should create a valid fallback plan", () => {
      const context = createTestContext();
      const plan = createFallbackLessonPlan(context);

      expect(plan.version).toBe("1.0");
      expect(plan.metadata.grade).toBe("1");
      expect(plan.metadata.subject).toBe("Math");
      expect(plan.sections.length).toBeGreaterThanOrEqual(4);
    });

    it("should include all required section types", () => {
      const context = createTestContext();
      const plan = createFallbackLessonPlan(context);

      const sectionTypes = plan.sections.map(s => s.type);
      expect(sectionTypes).toContain("warmup");
      expect(sectionTypes).toContain("instruction");
      expect(sectionTypes).toContain("closure");
    });

    it("should scale independent practice with lesson length", () => {
      const shortContext = createTestContext({ lessonLength: 30 });
      const shortPlan = createFallbackLessonPlan(shortContext);

      const longContext = createTestContext({ lessonLength: 60 });
      const longPlan = createFallbackLessonPlan(longContext);

      const shortIP = shortPlan.sections.find(s => s.type === "independent_practice")!;
      const longIP = longPlan.sections.find(s => s.type === "independent_practice")!;

      expect(longIP.durationMinutes).toBeGreaterThan(shortIP.durationMinutes);
    });
  });
});

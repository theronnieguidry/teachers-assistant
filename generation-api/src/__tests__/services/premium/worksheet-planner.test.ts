import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWorksheetPlan, createFallbackPlan, countQuestions } from "../../../services/premium/worksheet-planner.js";
import type { WorksheetPlan, VisualSettings, PremiumGenerationContext } from "../../../types/premium.js";
import type { AIProviderConfig } from "../../../services/ai-provider.js";

// Mock the AI provider
vi.mock("../../../services/ai-provider.js", () => ({
  generateContent: vi.fn(),
}));

import { generateContent } from "../../../services/ai-provider.js";

describe("Worksheet Planner", () => {
  const defaultVisualSettings: VisualSettings = {
    includeVisuals: false,
    richness: "minimal",
    style: "friendly_cartoon",
  };

  const mockAiConfig: AIProviderConfig = { provider: "openai", model: "gpt-4o" };

  const mockPlanJson = {
    version: "1.0",
    metadata: {
      title: "Test Worksheet",
      grade: "2",
      subject: "Math",
      topic: "Addition",
      learningObjectives: ["Learn to add numbers"],
      estimatedTime: "15 minutes",
    },
    structure: {
      header: {
        title: "Addition Practice",
        hasNameLine: true,
        hasDateLine: true,
        instructions: "Solve each problem.",
      },
      sections: [
        {
          id: "s1",
          type: "questions",
          items: [
            {
              id: "q1",
              questionText: "What is 2 + 3?",
              questionType: "short_answer",
              correctAnswer: "5",
            },
          ],
        },
      ],
    },
    style: {
      difficulty: "medium",
      visualStyle: "minimal",
    },
  };

  const createTestContext = (overrides?: Partial<PremiumGenerationContext>): PremiumGenerationContext => ({
    projectId: "test-project-123",
    userId: "test-user-456",
    prompt: "Create a math worksheet about addition",
    grade: "2",
    subject: "Math",
    options: { questionCount: 10 },
    visualSettings: defaultVisualSettings,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateContent).mockResolvedValue({
      content: JSON.stringify(mockPlanJson),
      inputTokens: 500,
      outputTokens: 800,
    });
  });

  describe("createWorksheetPlan", () => {
    it("should create a worksheet plan from prompt", async () => {
      const context = createTestContext();
      const result = await createWorksheetPlan(context, mockAiConfig);

      expect(result.plan).toBeDefined();
      expect(result.plan.version).toBe("1.0");
      expect(result.plan.metadata.grade).toBe("2");
    });

    it("should include visual placements when visuals are enabled", async () => {
      const context = createTestContext({
        visualSettings: {
          includeVisuals: true,
          richness: "standard",
          style: "friendly_cartoon",
        },
      });

      const result = await createWorksheetPlan(context, mockAiConfig);

      expect(result.plan).toBeDefined();
    });

    it("should handle API errors gracefully", async () => {
      vi.mocked(generateContent).mockRejectedValue(new Error("API Error"));

      const context = createTestContext();

      await expect(
        createWorksheetPlan(context, mockAiConfig)
      ).rejects.toThrow("API Error");
    });
  });

  describe("createFallbackPlan", () => {
    it("should create a valid fallback plan", () => {
      const context = createTestContext();
      const plan = createFallbackPlan(context);

      expect(plan.version).toBe("1.0");
      expect(plan.metadata.grade).toBe("2");
      expect(plan.metadata.subject).toBe("Math");
      expect(plan.structure.sections).toHaveLength(1);
      expect(plan.structure.sections[0].items).toHaveLength(10);
    });

    it("should use default question count when not specified", () => {
      const context = createTestContext({
        grade: "3",
        subject: "Science",
        options: {},
      });
      const plan = createFallbackPlan(context);

      expect(plan.structure.sections[0].items.length).toBeGreaterThan(0);
    });

    it("should set difficulty from options", () => {
      const context = createTestContext({
        options: { difficulty: "hard" },
      });
      const plan = createFallbackPlan(context);

      expect(plan.style.difficulty).toBe("hard");
    });
  });

  describe("countQuestions", () => {
    it("should count questions in plan", () => {
      const plan: WorksheetPlan = {
        version: "1.0",
        metadata: {
          title: "Test",
          grade: "2",
          subject: "Math",
          topic: "Addition",
          learningObjectives: [],
          estimatedTime: "15 min",
        },
        structure: {
          header: {
            title: "Test",
            hasNameLine: true,
            hasDateLine: true,
            instructions: "",
          },
          sections: [
            {
              id: "s1",
              type: "questions",
              items: [
                { id: "q1", questionText: "Q1", questionType: "short_answer", correctAnswer: "A1" },
                { id: "q2", questionText: "Q2", questionType: "short_answer", correctAnswer: "A2" },
              ],
            },
            {
              id: "s2",
              type: "multiple_choice",
              items: [
                { id: "q3", questionText: "Q3", questionType: "multiple_choice", correctAnswer: "A", options: ["A", "B"] },
              ],
            },
          ],
        },
        style: { difficulty: "medium", visualStyle: "minimal" },
      };

      expect(countQuestions(plan)).toBe(3);
    });

    it("should return 0 for empty plan", () => {
      const plan: WorksheetPlan = {
        version: "1.0",
        metadata: {
          title: "Empty",
          grade: "1",
          subject: "Math",
          topic: "",
          learningObjectives: [],
          estimatedTime: "",
        },
        structure: {
          header: { title: "", hasNameLine: false, hasDateLine: false, instructions: "" },
          sections: [],
        },
        style: { difficulty: "easy", visualStyle: "minimal" },
      };

      expect(countQuestions(plan)).toBe(0);
    });
  });
});

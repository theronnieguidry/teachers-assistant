import { describe, it, expect, vi, beforeEach } from "vitest";
import { validatePlan, attemptRepair, validateAndRepair } from "../../../services/premium/worksheet-validator.js";
import type { WorksheetPlan, ValidationRequirements, ValidationIssue, ImagePlacement } from "../../../types/premium.js";
import type { AIProviderConfig } from "../../../services/ai-provider.js";

// Mock the AI provider for attemptRepair / validateAndRepair tests
vi.mock("../../../services/ai-provider.js", () => ({
  generateContent: vi.fn(),
}));

import { generateContent } from "../../../services/ai-provider.js";

describe("Worksheet Validator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createValidPlan = (overrides?: Partial<WorksheetPlan>): WorksheetPlan => ({
    version: "1.0",
    metadata: {
      title: "Math Practice",
      grade: "2",
      subject: "Math",
      topic: "Addition",
      learningObjectives: ["Learn addition"],
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
            { id: "q1", questionText: "1 + 1 = ?", questionType: "short_answer", correctAnswer: "2" },
            { id: "q2", questionText: "2 + 2 = ?", questionType: "short_answer", correctAnswer: "4" },
            { id: "q3", questionText: "3 + 3 = ?", questionType: "short_answer", correctAnswer: "6" },
            { id: "q4", questionText: "4 + 4 = ?", questionType: "short_answer", correctAnswer: "8" },
            { id: "q5", questionText: "5 + 5 = ?", questionType: "short_answer", correctAnswer: "10" },
          ],
        },
      ],
    },
    style: {
      difficulty: "easy",
      visualStyle: "minimal",
    },
    ...overrides,
  });

  const defaultRequirements: ValidationRequirements = {
    minQuestions: 5,
    maxQuestions: 20,
    grade: "2",
    subject: "Math",
    requireAnswers: true,
  };

  describe("validatePlan", () => {
    it("should pass validation for a valid plan", async () => {
      const plan = createValidPlan();
      const result = await validatePlan(plan, defaultRequirements);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should fail when question count is below minimum", async () => {
      const plan = createValidPlan({
        structure: {
          header: createValidPlan().structure.header,
          sections: [
            {
              id: "s1",
              type: "questions",
              items: [
                { id: "q1", questionText: "1 + 1 = ?", questionType: "short_answer", correctAnswer: "2" },
              ],
            },
          ],
        },
      });

      const result = await validatePlan(plan, defaultRequirements);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.message.includes("Not enough questions") && i.severity === "error")).toBe(true);
    });

    it("should warn when question count exceeds maximum", async () => {
      const manyItems = Array.from({ length: 25 }, (_, i) => ({
        id: `q${i + 1}`,
        questionText: `Question ${i + 1}`,
        questionType: "short_answer" as const,
        correctAnswer: "answer",
      }));

      const plan = createValidPlan({
        structure: {
          header: createValidPlan().structure.header,
          sections: [{ id: "s1", type: "questions", items: manyItems }],
        },
      });

      const result = await validatePlan(plan, defaultRequirements);

      // Too many questions is a warning, not an error — plan is still valid
      expect(result.valid).toBe(true);
      expect(result.issues.some((i) => i.message.includes("Too many questions"))).toBe(true);
    });

    it("should fail when answers are required but missing", async () => {
      const plan = createValidPlan({
        structure: {
          header: createValidPlan().structure.header,
          sections: [
            {
              id: "s1",
              type: "questions",
              items: [
                { id: "q1", questionText: "What is 1 + 1?", questionType: "short_answer", correctAnswer: "" },
                { id: "q2", questionText: "What is 2 + 2?", questionType: "short_answer", correctAnswer: "4" },
                { id: "q3", questionText: "What is 3 + 3?", questionType: "short_answer", correctAnswer: "6" },
                { id: "q4", questionText: "What is 4 + 4?", questionType: "short_answer", correctAnswer: "8" },
                { id: "q5", questionText: "What is 5 + 5?", questionType: "short_answer", correctAnswer: "10" },
              ],
            },
          ],
        },
      });

      const result = await validatePlan(plan, defaultRequirements);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.message.includes("missing a correct answer"))).toBe(true);
    });

    it("should not flag empty metadata title (not validated)", async () => {
      const plan = createValidPlan({
        metadata: {
          ...createValidPlan().metadata,
          title: "",
        },
      });

      const result = await validatePlan(plan, defaultRequirements);

      // Validator does not check metadata.title — plan remains valid
      expect(result.valid).toBe(true);
    });

    it("should mark issues as auto-repairable when error count is small", async () => {
      const plan = createValidPlan({
        structure: {
          header: createValidPlan().structure.header,
          sections: [
            {
              id: "s1",
              type: "questions",
              items: [
                { id: "q1", questionText: "What is 1 + 1?", questionType: "short_answer", correctAnswer: "" },
                { id: "q2", questionText: "What is 2 + 2?", questionType: "short_answer", correctAnswer: "4" },
                { id: "q3", questionText: "What is 3 + 3?", questionType: "short_answer", correctAnswer: "6" },
                { id: "q4", questionText: "What is 4 + 4?", questionType: "short_answer", correctAnswer: "8" },
                { id: "q5", questionText: "What is 5 + 5?", questionType: "short_answer", correctAnswer: "10" },
              ],
            },
          ],
        },
      });

      const result = await validatePlan(plan, defaultRequirements);

      // 1 error (missing answer for q1) — auto-repairable threshold is <= 5
      expect(result.autoRepairable).toBe(true);
    });
  });

  describe("attemptRepair", () => {
    const mockAiConfig: AIProviderConfig = { provider: "openai", model: "gpt-4o" };

    it("should call AI with repair prompt and return repaired plan", async () => {
      const plan = createValidPlan({
        metadata: { ...createValidPlan().metadata, title: "" },
      });

      const repairedPlan = createValidPlan({
        metadata: { ...createValidPlan().metadata, title: "Repaired Title" },
      });

      vi.mocked(generateContent).mockResolvedValue({
        content: JSON.stringify(repairedPlan),
        inputTokens: 100,
        outputTokens: 200,
      });

      const issues: ValidationIssue[] = [
        { severity: "warning", field: "metadata.title", message: "Title is empty" },
      ];

      const result = await attemptRepair(plan, issues, mockAiConfig);

      expect(generateContent).toHaveBeenCalledOnce();
      expect(result.metadata.title).toBe("Repaired Title");
    });

    it("should parse JSON from markdown code blocks", async () => {
      const plan = createValidPlan();
      const repairedPlan = createValidPlan({
        metadata: { ...createValidPlan().metadata, title: "Fixed" },
      });

      vi.mocked(generateContent).mockResolvedValue({
        content: "```json\n" + JSON.stringify(repairedPlan) + "\n```",
        inputTokens: 100,
        outputTokens: 200,
      });

      const issues: ValidationIssue[] = [
        { severity: "warning", field: "metadata.title", message: "Title is empty" },
      ];

      const result = await attemptRepair(plan, issues, mockAiConfig);

      expect(result.metadata.title).toBe("Fixed");
    });

    it("should throw when AI returns invalid JSON", async () => {
      const plan = createValidPlan();

      vi.mocked(generateContent).mockResolvedValue({
        content: "not valid json",
        inputTokens: 100,
        outputTokens: 200,
      });

      const issues: ValidationIssue[] = [
        { severity: "error", field: "metadata.title", message: "Title is empty" },
      ];

      await expect(attemptRepair(plan, issues, mockAiConfig)).rejects.toThrow(
        "Plan repair failed to produce valid JSON"
      );
    });
  });

  describe("validateAndRepair", () => {
    const mockAiConfig: AIProviderConfig = { provider: "openai", model: "gpt-4o" };

    it("should return valid plan without repair if already valid", async () => {
      const plan = createValidPlan();
      const result = await validateAndRepair(plan, defaultRequirements, mockAiConfig);

      expect(result.validationResult.valid).toBe(true);
      expect(result.wasRepaired).toBe(false);
      expect(result.plan).toEqual(plan);
    });

    it("should repair and validate in one step", async () => {
      // Plan with a missing answer — causes 1 error (auto-repairable)
      const plan = createValidPlan({
        structure: {
          header: createValidPlan().structure.header,
          sections: [
            {
              id: "s1",
              type: "questions",
              items: [
                { id: "q1", questionText: "What is 1 + 1?", questionType: "short_answer", correctAnswer: "" },
                { id: "q2", questionText: "What is 2 + 2?", questionType: "short_answer", correctAnswer: "4" },
                { id: "q3", questionText: "What is 3 + 3?", questionType: "short_answer", correctAnswer: "6" },
                { id: "q4", questionText: "What is 4 + 4?", questionType: "short_answer", correctAnswer: "8" },
                { id: "q5", questionText: "What is 5 + 5?", questionType: "short_answer", correctAnswer: "10" },
              ],
            },
          ],
        },
      });

      // AI returns a repaired plan with the answer filled in
      const repairedPlan = createValidPlan();

      vi.mocked(generateContent).mockResolvedValue({
        content: JSON.stringify(repairedPlan),
        inputTokens: 100,
        outputTokens: 200,
      });

      const result = await validateAndRepair(plan, defaultRequirements, mockAiConfig);

      expect(result.validationResult.valid).toBe(true);
      expect(result.wasRepaired).toBe(true);
      expect(result.plan.structure.sections[0].items[0].correctAnswer).toBe("2");
    });

    it("should return without repair if too many errors for auto-repair", async () => {
      // 6 items with empty answers AND short text → 6 answer errors + 6 short-text errors = 12 errors (>5)
      const plan = createValidPlan({
        structure: {
          header: createValidPlan().structure.header,
          sections: [
            {
              id: "s1",
              type: "questions",
              items: [
                { id: "q1", questionText: "Q1", questionType: "short_answer", correctAnswer: "" },
                { id: "q2", questionText: "Q2", questionType: "short_answer", correctAnswer: "" },
                { id: "q3", questionText: "Q3", questionType: "short_answer", correctAnswer: "" },
                { id: "q4", questionText: "Q4", questionType: "short_answer", correctAnswer: "" },
                { id: "q5", questionText: "Q5", questionType: "short_answer", correctAnswer: "" },
                { id: "q6", questionText: "Q6", questionType: "short_answer", correctAnswer: "" },
              ],
            },
          ],
        },
      });

      const result = await validateAndRepair(plan, { ...defaultRequirements, minQuestions: 5 }, mockAiConfig);

      expect(result.validationResult.valid).toBe(false);
      expect(result.wasRepaired).toBe(false);
      // AI should not have been called for non-repairable plans (>5 errors)
      expect(generateContent).not.toHaveBeenCalled();
    });
  });

  describe("visualPlacements validation", () => {
    it("should pass when visualPlacements reference valid item IDs", async () => {
      const plan = createValidPlan({
        visualPlacements: [
          {
            afterItemId: "q2",
            description: "counting apples",
            purpose: "counting_support" as any,
            size: "medium",
          },
        ],
      });

      const result = await validatePlan(plan, defaultRequirements);

      const placementIssues = result.issues.filter((i) =>
        i.field.startsWith("visualPlacements")
      );
      expect(placementIssues).toHaveLength(0);
    });

    it("should warn when visualPlacements reference non-existent item IDs", async () => {
      const plan = createValidPlan({
        visualPlacements: [
          {
            afterItemId: "q99",
            description: "counting apples",
            purpose: "counting_support" as any,
            size: "medium",
          },
        ],
      });

      const result = await validatePlan(plan, defaultRequirements);

      expect(
        result.issues.some(
          (i) =>
            i.field.includes("afterItemId") &&
            i.message.includes("non-existent")
        )
      ).toBe(true);
    });

    it("should warn on invalid size values", async () => {
      const plan = createValidPlan({
        visualPlacements: [
          {
            afterItemId: "q1",
            description: "counting apples",
            purpose: "counting_support" as any,
            size: "large" as any,
          },
        ],
      });

      const result = await validatePlan(plan, defaultRequirements);

      expect(
        result.issues.some(
          (i) =>
            i.field.includes("size") && i.message.includes("invalid size")
        )
      ).toBe(true);
    });

    it("should warn on invalid purpose values", async () => {
      const plan = createValidPlan({
        visualPlacements: [
          {
            afterItemId: "q1",
            description: "counting apples",
            purpose: "unknown_purpose" as any,
            size: "medium",
          },
        ],
      });

      const result = await validatePlan(plan, defaultRequirements);

      expect(
        result.issues.some(
          (i) =>
            i.field.includes("purpose") &&
            i.message.includes("invalid purpose")
        )
      ).toBe(true);
    });

    it("should warn on empty description", async () => {
      const plan = createValidPlan({
        visualPlacements: [
          {
            afterItemId: "q1",
            description: "",
            purpose: "counting_support" as any,
            size: "medium",
          },
        ],
      });

      const result = await validatePlan(plan, defaultRequirements);

      expect(
        result.issues.some(
          (i) =>
            i.field.includes("description") &&
            i.message.includes("empty description")
        )
      ).toBe(true);
    });

    it("should strip per-item visual fields from items", async () => {
      const plan = createValidPlan();
      // Add visual fields to items (simulating AI adding them)
      const itemAny = plan.structure.sections[0].items[0] as any;
      itemAny.visualHint = "some visual hint";
      itemAny.imageDescription = "some image description";

      const result = await validatePlan(plan, defaultRequirements);

      // Fields should be stripped
      expect(itemAny.visualHint).toBeUndefined();
      expect(itemAny.imageDescription).toBeUndefined();

      // Warnings should be issued
      expect(
        result.issues.some(
          (i) =>
            i.message.includes("visualHint") &&
            i.message.includes("Stripped")
        )
      ).toBe(true);
      expect(
        result.issues.some(
          (i) =>
            i.message.includes("imageDescription") &&
            i.message.includes("Stripped")
        )
      ).toBe(true);
    });

    it("should pass when no visualPlacements are present", async () => {
      const plan = createValidPlan();
      // Ensure no visualPlacements
      delete (plan as any).visualPlacements;

      const result = await validatePlan(plan, defaultRequirements);

      const placementIssues = result.issues.filter((i) =>
        i.field.startsWith("visualPlacements")
      );
      expect(placementIssues).toHaveLength(0);
    });

    it("should accept valid sizes: small, medium, wide", async () => {
      const plan = createValidPlan({
        visualPlacements: [
          { afterItemId: "q1", description: "counting objects", purpose: "counting_support" as any, size: "small" },
          { afterItemId: "q2", description: "shape diagram", purpose: "shape_diagram" as any, size: "medium" },
          { afterItemId: "q3", description: "wide banner", purpose: "diagram" as any, size: "wide" },
        ],
      });

      const result = await validatePlan(plan, defaultRequirements);

      const sizeIssues = result.issues.filter((i) =>
        i.field.includes("size")
      );
      expect(sizeIssues).toHaveLength(0);
    });
  });
});

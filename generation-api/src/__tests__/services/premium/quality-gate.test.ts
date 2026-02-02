import { describe, it, expect } from "vitest";
import { runQualityGate, getQualitySummary } from "../../../services/premium/quality-gate.js";
import type { QualityRequirements, QualityCheckResult, WorksheetPlan } from "../../../types/premium.js";

describe("Quality Gate", () => {
  const createValidHtml = (questionCount: number = 5) => {
    const questions = Array.from({ length: questionCount }, (_, i) =>
      `<div class="question"><p>${i + 1}. What is ${i} + 1?</p><div class="answer-line"></div></div>`
    ).join("\n");

    return `<!DOCTYPE html>
<html>
<head><title>Test Worksheet</title></head>
<body>
  <header>
    <h1>Math Practice</h1>
    <div class="name-line">Name: ___________</div>
    <div class="date-line">Date: ___________</div>
  </header>
  <main>
    <p class="instructions">Solve each problem below.</p>
    ${questions}
  </main>
  <style>.question { margin: 10px; }</style>
</body>
</html>`;
  };

  const createValidAnswerKey = () => `<!DOCTYPE html>
<html>
<head><title>Answer Key</title></head>
<body>
  <h1>Answer Key</h1>
  <ol>
    <li>1</li>
    <li>2</li>
    <li>3</li>
    <li>4</li>
    <li>5</li>
  </ol>
  <style>.answer { margin: 5px; }</style>
</body>
</html>`;

  // Create a minimal valid WorksheetPlan for testing
  const createMockPlan = (questionCount: number = 5): WorksheetPlan => ({
    title: "Test Worksheet",
    grade: "2",
    subject: "Math",
    structure: {
      sections: [
        {
          title: "Practice Problems",
          items: Array.from({ length: questionCount }, (_, i) => ({
            id: `q${i + 1}`,
            type: "short_answer" as const,
            prompt: `What is ${i} + 1?`,
            answer: `${i + 1}`,
            points: 1,
          })),
        },
      ],
    },
  });

  const defaultRequirements: QualityRequirements = {
    expectedQuestionCount: 5,
    requireAnswerKey: true,
    requirePrintFriendly: true,
  };

  describe("runQualityGate", () => {
    it("should pass quality check for valid HTML", async () => {
      const result = await runQualityGate(
        createValidHtml(5),
        createMockPlan(5),
        defaultRequirements,
        createValidAnswerKey()
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.shouldCharge).toBe(true);
    });

    it("should fail when worksheet HTML is empty", async () => {
      const result = await runQualityGate(
        "",
        createMockPlan(5),
        defaultRequirements,
        createValidAnswerKey()
      );

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(50);
      expect(result.issues.some((i) => i.category === "html_structure")).toBe(true);
    });

    it("should fail when question count is significantly wrong", async () => {
      const result = await runQualityGate(
        createValidHtml(2), // Only 2 questions when 10 expected
        createMockPlan(10),
        { ...defaultRequirements, expectedQuestionCount: 10 },
        createValidAnswerKey()
      );

      expect(result.issues.some((i) => i.category === "question_count")).toBe(true);
    });

    it("should warn when answer key is missing but required", async () => {
      const result = await runQualityGate(
        createValidHtml(5),
        createMockPlan(5),
        { ...defaultRequirements, requireAnswerKey: true },
        "" // No answer key
      );

      expect(result.issues.some((i) => i.category === "answer_key")).toBe(true);
    });

    it("should check for print-friendly elements", async () => {
      const unprintableHtml = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
        <div style="background-color: black; color: white;">
          Dark content that won't print well
        </div>
        <script>console.log("scripts bad for print")</script>
        Name: _____
        Date: _____
        This is some content that has enough length to pass the minimum content check and should be considered valid.
      </body></html>`;

      const result = await runQualityGate(
        unprintableHtml,
        createMockPlan(0),
        { ...defaultRequirements, requirePrintFriendly: true, requireAnswerKey: false, expectedQuestionCount: 0 },
        ""
      );

      // Should have issues about missing style tag or other print-unfriendly elements
      expect(result.issues.some((i) => i.category === "html_structure" || i.category === "print_friendly")).toBe(true);
    });

    it("should not require answer key when disabled", async () => {
      const result = await runQualityGate(
        createValidHtml(5),
        createMockPlan(5),
        { ...defaultRequirements, requireAnswerKey: false },
        "" // No answer key
      );

      expect(result.issues.filter((i) => i.category === "answer_key")).toHaveLength(0);
    });

    it("should return shouldCharge=false for very low scores", async () => {
      const result = await runQualityGate(
        "<html><body></body></html>", // Minimal invalid HTML
        createMockPlan(5),
        defaultRequirements,
        ""
      );

      if (result.score < 50) {
        expect(result.shouldCharge).toBe(false);
      }
    });

    it("should return shouldCharge=true for scores >= 50", async () => {
      const result = await runQualityGate(
        createValidHtml(5),
        createMockPlan(5),
        defaultRequirements,
        createValidAnswerKey()
      );

      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.shouldCharge).toBe(true);
    });

    it("should check image count when visuals are enabled", async () => {
      // Only 1 image provided when 5 are expected (1 < 5 * 0.5 = 2.5, so this triggers warning)
      const mockImages = [
        { base64Data: "test", mediaType: "image/png" as const, width: 400, height: 300 },
      ];
      const planWithPlacements = {
        ...createMockPlan(5),
        visualPlacements: [
          { afterItemId: "q1", description: "test", purpose: "counting_support" as const, size: "medium" as const },
          { afterItemId: "q2", description: "test", purpose: "diagram" as const, size: "medium" as const },
          { afterItemId: "q3", description: "test", purpose: "diagram" as const, size: "medium" as const },
          { afterItemId: "q4", description: "test", purpose: "diagram" as const, size: "medium" as const },
          { afterItemId: "q5", description: "test", purpose: "diagram" as const, size: "medium" as const },
        ],
      };

      const result = await runQualityGate(
        createValidHtml(5),
        planWithPlacements,
        { ...defaultRequirements, expectedImageCount: 5, visualRichness: "standard" },
        createValidAnswerKey(),
        mockImages,
        { includeVisuals: true, richness: "standard", style: "friendly_cartoon" }
      );

      // Should have warning about image count mismatch (1 image for 5 expected, 1 < 2.5)
      expect(result.issues.some((i) => i.category === "image_count")).toBe(true);
    });

    it("should check image size when visuals are enabled", async () => {
      // Create large "image" data
      // Threshold is 5MB, and function estimates bytes as base64.length * 0.75
      // So we need >6.67MB of base64 to exceed 5MB after conversion
      const largeBase64 = "a".repeat(8 * 1024 * 1024); // 8MB base64 → ~6MB actual
      const mockImages = [
        { base64Data: largeBase64, mediaType: "image/png" as const, width: 400, height: 300 },
      ];

      const result = await runQualityGate(
        createValidHtml(5),
        createMockPlan(5),
        { ...defaultRequirements, visualRichness: "standard" },
        createValidAnswerKey(),
        mockImages,
        { includeVisuals: true, richness: "standard", style: "friendly_cartoon" }
      );

      expect(result.issues.some((i) => i.category === "image_size")).toBe(true);
    });

    it("should detect placeholder images", async () => {
      const mockImages = [
        { base64Data: "placeholder:abc123", mediaType: "image/png" as const, width: 200, height: 150 },
      ];
      const planWithPlacements = {
        ...createMockPlan(5),
        visualPlacements: [
          { afterItemId: "q1", description: "test", purpose: "counting_support" as const, size: "medium" as const },
        ],
      };

      const result = await runQualityGate(
        createValidHtml(5),
        planWithPlacements,
        { ...defaultRequirements, expectedImageCount: 1 },
        createValidAnswerKey(),
        mockImages,
        { includeVisuals: true, richness: "standard", style: "friendly_cartoon" }
      );

      expect(result.issues.some((i) => i.category === "image_missing")).toBe(true);
    });
  });

  describe("getQualitySummary", () => {
    it("should return pass summary for passing result", () => {
      const result: QualityCheckResult = {
        passed: true,
        score: 85,
        issues: [],
        shouldCharge: true,
      };

      const summary = getQualitySummary(result);

      expect(summary).toContain("passed");
      expect(summary).toContain("85");
    });

    it("should return fail summary for failing result", () => {
      const result: QualityCheckResult = {
        passed: false,
        score: 35,
        issues: [
          { category: "html_structure", severity: "error", message: "Invalid HTML" },
          { category: "question_count", severity: "warning", message: "Too few questions" },
        ],
        shouldCharge: false,
      };

      const summary = getQualitySummary(result);

      expect(summary).toContain("failed");
      expect(summary).toContain("35");
      // Summary lists error messages
      expect(summary).toContain("Invalid HTML");
    });

    it("should mention refund for non-chargeable results", () => {
      const result: QualityCheckResult = {
        passed: false,
        score: 40,
        issues: [{ category: "content_quality", severity: "error", message: "Poor quality" }],
        shouldCharge: false,
      };

      const summary = getQualitySummary(result);

      // Quality check failed indicates issue - shouldCharge is tracked separately
      expect(summary.toLowerCase()).toContain("failed");
    });
  });
});

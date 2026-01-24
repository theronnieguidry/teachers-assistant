import { describe, it, expect } from "vitest";
import {
  buildWorksheetPrompt,
  buildLessonPlanPrompt,
  buildAnswerKeyPrompt,
  buildInspirationParsePrompt,
} from "../../prompts/templates.js";

describe("Prompt Templates", () => {
  const baseContext = {
    prompt: "Create a worksheet about addition",
    grade: "2" as const,
    subject: "Math",
    options: {
      questionCount: 10,
      includeVisuals: true,
      difficulty: "medium" as const,
    },
    inspiration: [],
  };

  describe("buildWorksheetPrompt", () => {
    it("should include the user prompt", () => {
      const result = buildWorksheetPrompt(baseContext);
      expect(result).toContain("Create a worksheet about addition");
    });

    it("should include grade level description", () => {
      const result = buildWorksheetPrompt(baseContext);
      expect(result).toContain("2nd Grade (ages 7-8)");
    });

    it("should include subject", () => {
      const result = buildWorksheetPrompt(baseContext);
      expect(result).toContain("Subject: Math");
    });

    it("should include question count", () => {
      const result = buildWorksheetPrompt(baseContext);
      expect(result).toContain("10 questions");
    });

    it("should include visual instructions when enabled", () => {
      const result = buildWorksheetPrompt(baseContext);
      expect(result).toContain("[VISUAL:");
      expect(result).toContain("Visual Placeholders");
    });

    it("should not include visual instructions when disabled", () => {
      const context = {
        ...baseContext,
        options: { ...baseContext.options, includeVisuals: false },
      };
      const result = buildWorksheetPrompt(context);
      expect(result).not.toContain("[VISUAL:");
    });

    it("should include difficulty instructions", () => {
      const result = buildWorksheetPrompt(baseContext);
      expect(result).toContain("grade-appropriate vocabulary");
    });

    it("should mention HTML output format", () => {
      const result = buildWorksheetPrompt(baseContext);
      expect(result).toContain("HTML");
      expect(result).toContain("Return ONLY valid HTML");
    });

    it("should include different difficulty levels", () => {
      const easyContext = {
        ...baseContext,
        options: { ...baseContext.options, difficulty: "easy" as const },
      };
      const hardContext = {
        ...baseContext,
        options: { ...baseContext.options, difficulty: "hard" as const },
      };

      expect(buildWorksheetPrompt(easyContext)).toContain("simple vocabulary");
      expect(buildWorksheetPrompt(hardContext)).toContain("critical thinking");
    });
  });

  describe("buildLessonPlanPrompt", () => {
    it("should include the user prompt", () => {
      const result = buildLessonPlanPrompt(baseContext);
      expect(result).toContain("Create a worksheet about addition");
    });

    it("should include lesson plan sections", () => {
      const result = buildLessonPlanPrompt(baseContext);
      expect(result).toContain("Learning Objectives");
      expect(result).toContain("Materials Needed");
      expect(result).toContain("Warm-Up Activity");
      expect(result).toContain("Direct Instruction");
      expect(result).toContain("Guided Practice");
      expect(result).toContain("Independent Practice");
      expect(result).toContain("Closure");
      expect(result).toContain("Differentiation");
      expect(result).toContain("Assessment");
    });

    it("should include time estimates", () => {
      const result = buildLessonPlanPrompt(baseContext);
      expect(result).toContain("5-10 minutes");
      expect(result).toContain("15-20 minutes");
    });

    it("should mention HTML output", () => {
      const result = buildLessonPlanPrompt(baseContext);
      expect(result).toContain("HTML");
    });
  });

  describe("buildAnswerKeyPrompt", () => {
    const worksheetHtml = "<html><body><h1>Test Worksheet</h1></body></html>";

    it("should include the original worksheet HTML", () => {
      const result = buildAnswerKeyPrompt(baseContext, worksheetHtml);
      expect(result).toContain(worksheetHtml);
    });

    it("should mention ANSWER KEY in output", () => {
      const result = buildAnswerKeyPrompt(baseContext, worksheetHtml);
      expect(result).toContain("ANSWER KEY");
    });

    it("should include answer key requirements", () => {
      const result = buildAnswerKeyPrompt(baseContext, worksheetHtml);
      expect(result).toContain("complete answers for ALL questions");
      expect(result).toContain("explanations");
      expect(result).toContain("scoring guidelines");
    });
  });

  describe("buildInspirationParsePrompt", () => {
    it("should include content type", () => {
      const result = buildInspirationParsePrompt("Sample content", "url");
      expect(result).toContain("url");
    });

    it("should include the content to parse", () => {
      const content = "This is sample educational content";
      const result = buildInspirationParsePrompt(content, "pdf");
      expect(result).toContain(content);
    });

    it("should request relevant extraction", () => {
      const result = buildInspirationParsePrompt("Content", "url");
      expect(result).toContain("topics and concepts");
      expect(result).toContain("Teaching approaches");
      expect(result).toContain("Question types");
    });
  });

  describe("with inspiration materials", () => {
    it("should include inspiration content in prompts", () => {
      const contextWithInspiration = {
        ...baseContext,
        inspiration: [
          {
            id: "insp-1",
            type: "url" as const,
            title: "Example Site",
            extractedContent: "Sample extracted content from the website",
          },
        ],
      };

      const result = buildWorksheetPrompt(contextWithInspiration);
      expect(result).toContain("Reference Materials");
      expect(result).toContain("Example Site");
      expect(result).toContain("Sample extracted content");
    });

    it("should handle multiple inspiration items", () => {
      const contextWithInspiration = {
        ...baseContext,
        inspiration: [
          { id: "1", type: "url" as const, title: "Site 1", extractedContent: "Content 1" },
          { id: "2", type: "pdf" as const, title: "Doc 1", extractedContent: "Content 2" },
        ],
      };

      const result = buildWorksheetPrompt(contextWithInspiration);
      expect(result).toContain("Reference 1: Site 1");
      expect(result).toContain("Reference 2: Doc 1");
    });
  });

  describe("grade level handling", () => {
    it("should handle Kindergarten", () => {
      const context = { ...baseContext, grade: "K" as const };
      const result = buildWorksheetPrompt(context);
      expect(result).toContain("Kindergarten (ages 5-6)");
    });

    it("should handle all grade levels", () => {
      const grades = ["K", "1", "2", "3", "4", "5", "6"] as const;
      const expectedDescriptions = [
        "Kindergarten",
        "1st Grade",
        "2nd Grade",
        "3rd Grade",
        "4th Grade",
        "5th Grade",
        "6th Grade",
      ];
      for (let i = 0; i < grades.length; i++) {
        const context = { ...baseContext, grade: grades[i] };
        const result = buildWorksheetPrompt(context);
        expect(result).toContain(expectedDescriptions[i]);
      }
    });
  });
});

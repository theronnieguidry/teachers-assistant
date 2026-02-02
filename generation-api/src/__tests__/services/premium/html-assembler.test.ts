/**
 * Tests for HTML Assembler Service
 *
 * Covers assembleWorksheet, assembleAnswerKey, assembleLessonPlan, assembleAll
 * with focus on the size strategy (4.4): CSS classes, image rendering, and placement mapping.
 */

import { describe, it, expect } from "vitest";
import {
  assembleWorksheet,
  assembleAnswerKey,
  assembleLessonPlan,
  assembleAll,
} from "../../../services/premium/html-assembler.js";
import type { WorksheetPlan, ImageResult } from "../../../types/premium.js";

// ============================================
// Test Fixtures
// ============================================

const createTestPlan = (overrides?: Partial<WorksheetPlan>): WorksheetPlan => ({
  version: "1.0",
  metadata: {
    title: "Addition Practice",
    grade: "2",
    subject: "Math",
    topic: "Addition",
    learningObjectives: ["Add single-digit numbers", "Solve word problems"],
    estimatedTime: "20 minutes",
  },
  structure: {
    header: {
      title: "Addition Practice",
      hasNameLine: true,
      hasDateLine: true,
      instructions: "Solve each problem below.",
    },
    sections: [
      {
        id: "s1",
        type: "questions",
        title: "Practice Problems",
        instructions: "Show your work.",
        items: [
          {
            id: "q1",
            questionText: "What is 1 + 1?",
            questionType: "short_answer",
            correctAnswer: "2",
            explanation: "1 plus 1 equals 2",
            points: 1,
          },
          {
            id: "q2",
            questionText: "What is 2 + 3?",
            questionType: "short_answer",
            correctAnswer: "5",
            explanation: "2 plus 3 equals 5",
            points: 1,
          },
          {
            id: "q3",
            questionText: "What is 4 + 5?",
            questionType: "short_answer",
            correctAnswer: "9",
            points: 2,
          },
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

const createTestImage = (overrides?: Partial<ImageResult>): ImageResult => ({
  base64Data: "iVBORw0KGgoAAAANSUhEUgAAAAE",
  mediaType: "image/png",
  width: 1024,
  height: 1024,
  ...overrides,
});

// ============================================
// Tests
// ============================================

describe("HTML Assembler Service", () => {
  describe("assembleWorksheet", () => {
    it("should produce valid HTML document structure", () => {
      const plan = createTestPlan();
      const html = assembleWorksheet(plan);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html lang=\"en\">");
      expect(html).toContain("<head>");
      expect(html).toContain("<style>");
      expect(html).toContain("</style>");
      expect(html).toContain("<body>");
      expect(html).toContain("</body>");
      expect(html).toContain("</html>");
    });

    it("should include the plan title in the HTML title tag", () => {
      const plan = createTestPlan();
      const html = assembleWorksheet(plan);

      expect(html).toContain("<title>Addition Practice</title>");
    });

    it("should escape HTML entities in title and content", () => {
      const plan = createTestPlan({
        metadata: {
          ...createTestPlan().metadata,
          title: "Math <script>alert('xss')</script>",
        },
        structure: {
          ...createTestPlan().structure,
          header: {
            ...createTestPlan().structure.header,
            title: "Test & More <b>Bold</b>",
            instructions: 'Say "hello" & goodbye',
          },
        },
      });
      const html = assembleWorksheet(plan);

      expect(html).toContain("&lt;script&gt;");
      expect(html).not.toContain("<script>alert");
      expect(html).toContain("Test &amp; More &lt;b&gt;Bold&lt;/b&gt;");
      expect(html).toContain("Say &quot;hello&quot; &amp; goodbye");
    });

    it("should render name and date lines when enabled", () => {
      const plan = createTestPlan();
      const html = assembleWorksheet(plan);

      expect(html).toContain("Name: _______________________");
      expect(html).toContain("Date: _______________");
    });

    it("should omit name line when hasNameLine is false", () => {
      const plan = createTestPlan({
        structure: {
          ...createTestPlan().structure,
          header: {
            ...createTestPlan().structure.header,
            hasNameLine: false,
          },
        },
      });
      const html = assembleWorksheet(plan);

      expect(html).not.toContain("Name: _______________________");
      expect(html).toContain("Date: _______________");
    });

    it("should omit date line when hasDateLine is false", () => {
      const plan = createTestPlan({
        structure: {
          ...createTestPlan().structure,
          header: {
            ...createTestPlan().structure.header,
            hasDateLine: false,
          },
        },
      });
      const html = assembleWorksheet(plan);

      expect(html).toContain("Name: _______________________");
      expect(html).not.toContain("Date: _______________");
    });

    it("should render section title and instructions", () => {
      const plan = createTestPlan();
      const html = assembleWorksheet(plan);

      expect(html).toContain("Practice Problems");
      expect(html).toContain("Show your work.");
    });

    // ===== Question Type Tests =====

    it("should render multiple_choice questions with options", () => {
      const plan = createTestPlan({
        structure: {
          ...createTestPlan().structure,
          sections: [
            {
              id: "s1",
              type: "multiple_choice",
              items: [
                {
                  id: "q1",
                  questionText: "What color is the sky?",
                  questionType: "multiple_choice",
                  options: ["Red", "Blue", "Green"],
                  correctAnswer: "Blue",
                },
              ],
            },
          ],
        },
      });
      const html = assembleWorksheet(plan);

      expect(html).toContain("What color is the sky?");
      expect(html).toContain('<div class="options">');
      expect(html).toContain("Red");
      expect(html).toContain("Blue");
      expect(html).toContain("Green");
    });

    it("should render true_false questions", () => {
      const plan = createTestPlan({
        structure: {
          ...createTestPlan().structure,
          sections: [
            {
              id: "s1",
              type: "true_false",
              items: [
                {
                  id: "q1",
                  questionText: "The sun is a star.",
                  questionType: "true_false",
                  correctAnswer: "True",
                },
              ],
            },
          ],
        },
      });
      const html = assembleWorksheet(plan);

      expect(html).toContain("The sun is a star.");
      expect(html).toContain("True");
      expect(html).toContain("False");
      expect(html).toContain("true-false-options");
    });

    it("should render fill_blank questions with answer lines", () => {
      const plan = createTestPlan({
        structure: {
          ...createTestPlan().structure,
          sections: [
            {
              id: "s1",
              type: "fill_blank",
              items: [
                {
                  id: "q1",
                  questionText: "The cat sat on the ___.",
                  questionType: "fill_blank",
                  correctAnswer: "mat",
                },
              ],
            },
          ],
        },
      });
      const html = assembleWorksheet(plan);

      expect(html).toContain("The cat sat on the");
      expect(html).toContain("answer-line");
    });

    it("should render matching questions", () => {
      const plan = createTestPlan({
        structure: {
          ...createTestPlan().structure,
          sections: [
            {
              id: "s1",
              type: "matching",
              items: [
                {
                  id: "q1",
                  questionText: "Apple",
                  questionType: "matching",
                  correctAnswer: "Fruit",
                },
              ],
            },
          ],
        },
      });
      const html = assembleWorksheet(plan);

      expect(html).toContain("Apple");
      expect(html).toContain("matching-item");
      expect(html).toContain("matching-left");
      expect(html).toContain("matching-line");
      expect(html).toContain("matching-right");
    });

    it("should render short_answer questions with answer area", () => {
      const plan = createTestPlan();
      const html = assembleWorksheet(plan);

      expect(html).toContain("What is 1 + 1?");
      // short_answer renders a line for writing
      expect(html).toContain("border-bottom: 1px solid #ccc");
    });

    // ===== Size Strategy Tests (4.4 Core) =====

    it("should assign img-small class for small-sized placements", () => {
      const plan = createTestPlan({
        visualPlacements: [
          {
            afterItemId: "q1",
            description: "counting objects",
            purpose: "counting_support",
            size: "small",
          },
        ],
      });
      const image = createTestImage();
      const html = assembleWorksheet(plan, [image]);

      expect(html).toContain('class="worksheet-image img-small"');
    });

    it("should assign img-medium class for medium-sized placements", () => {
      const plan = createTestPlan({
        visualPlacements: [
          {
            afterItemId: "q1",
            description: "addition diagram",
            purpose: "diagram",
            size: "medium",
          },
        ],
      });
      const image = createTestImage();
      const html = assembleWorksheet(plan, [image]);

      expect(html).toContain('class="worksheet-image img-medium"');
    });

    it("should assign img-wide class for wide-sized placements", () => {
      const plan = createTestPlan({
        visualPlacements: [
          {
            afterItemId: "q1",
            description: "number line banner",
            purpose: "diagram",
            size: "wide",
          },
        ],
      });
      const image = createTestImage();
      const html = assembleWorksheet(plan, [image]);

      expect(html).toContain('class="worksheet-image img-wide"');
    });

    it("should default to img-medium when image has no size info via placementId", () => {
      // When an image has a placementId but no matching placement in plan,
      // it defaults to "medium"
      const plan = createTestPlan();
      const image = createTestImage({ placementId: "q2" });
      const html = assembleWorksheet(plan, [image]);

      expect(html).toContain('class="worksheet-image img-medium"');
    });

    it("should handle legacy large size gracefully", () => {
      const plan = createTestPlan({
        visualPlacements: [
          {
            afterItemId: "q1",
            description: "large image",
            purpose: "diagram",
            size: "large" as any, // Legacy size
          },
        ],
      });
      const image = createTestImage();
      const html = assembleWorksheet(plan, [image]);

      expect(html).toContain('class="worksheet-image img-large"');
    });

    it("should render mixed sizes within the same worksheet", () => {
      const plan = createTestPlan({
        visualPlacements: [
          {
            afterItemId: "q1",
            description: "small icon",
            purpose: "counting_support",
            size: "small",
          },
          {
            afterItemId: "q2",
            description: "medium diagram",
            purpose: "diagram",
            size: "medium",
          },
          {
            afterItemId: "q3",
            description: "wide banner",
            purpose: "diagram",
            size: "wide",
          },
        ],
      });
      const images = [createTestImage(), createTestImage(), createTestImage()];
      const html = assembleWorksheet(plan, images);

      expect(html).toContain('class="worksheet-image img-small"');
      expect(html).toContain('class="worksheet-image img-medium"');
      expect(html).toContain('class="worksheet-image img-wide"');
    });

    it("should include all size CSS classes in stylesheet", () => {
      const plan = createTestPlan();
      const html = assembleWorksheet(plan);

      // Verify CSS class definitions
      expect(html).toContain(".img-small");
      expect(html).toContain("max-width: 150px");
      expect(html).toContain(".img-medium");
      expect(html).toContain("max-width: 300px");
      expect(html).toContain(".img-wide");
      expect(html).toContain("max-width: 100%");
    });

    it("should center worksheet images with display block and auto margins", () => {
      const plan = createTestPlan();
      const html = assembleWorksheet(plan);

      expect(html).toContain(".worksheet-image");
      expect(html).toContain("display: block");
      expect(html).toContain("margin: 15px auto");
    });

    it("should render image as base64 data URI with correct media type", () => {
      const plan = createTestPlan({
        visualPlacements: [
          {
            afterItemId: "q1",
            description: "test image",
            purpose: "counting_support",
            size: "medium",
          },
        ],
      });
      const image = createTestImage({
        base64Data: "testBase64Data",
        mediaType: "image/webp",
      });
      const html = assembleWorksheet(plan, [image]);

      expect(html).toContain('src="data:image/webp;base64,testBase64Data"');
      expect(html).toContain('alt="Illustration"');
    });

    it("should not render images when no images match item IDs", () => {
      const plan = createTestPlan({
        visualPlacements: [
          {
            afterItemId: "q1",
            description: "test image",
            purpose: "counting_support",
            size: "medium",
          },
        ],
      });
      // No images provided
      const html = assembleWorksheet(plan, []);

      expect(html).not.toContain("<img");
    });

    it("should map images to placements by index order", () => {
      const plan = createTestPlan({
        visualPlacements: [
          {
            afterItemId: "q1",
            description: "first image",
            purpose: "counting_support",
            size: "small",
          },
          {
            afterItemId: "q2",
            description: "second image",
            purpose: "diagram",
            size: "wide",
          },
        ],
      });
      const images = [
        createTestImage({ base64Data: "firstImageData" }),
        createTestImage({ base64Data: "secondImageData" }),
      ];
      const html = assembleWorksheet(plan, images);

      // First image should be small (before q1)
      expect(html).toContain('class="worksheet-image img-small" src="data:image/png;base64,firstImageData"');
      // Second image should be wide (before q2)
      expect(html).toContain('class="worksheet-image img-wide" src="data:image/png;base64,secondImageData"');
    });

    it("should map images by placementId when set on ImageResult", () => {
      const plan = createTestPlan({
        visualPlacements: [
          {
            afterItemId: "q2",
            description: "placed by ID",
            purpose: "diagram",
            size: "wide",
          },
        ],
      });
      // Image has placementId but is NOT at index 0
      // Since plan has 1 placement and we pass 0 images by index,
      // the image should map by placementId
      const image = createTestImage({
        base64Data: "placedById",
        placementId: "q2",
      });
      const html = assembleWorksheet(plan, [image]);

      expect(html).toContain('class="worksheet-image img-wide" src="data:image/png;base64,placedById"');
    });

    it("should produce worksheet without images when no visual placements defined", () => {
      const plan = createTestPlan();
      const html = assembleWorksheet(plan);

      expect(html).not.toContain("<img");
      expect(html).toContain("What is 1 + 1?");
      expect(html).toContain("What is 2 + 3?");
    });

    it("should render wide images without overflow via CSS", () => {
      const plan = createTestPlan();
      const html = assembleWorksheet(plan);

      // .img-wide uses max-width: 100% which prevents overflow
      expect(html).toContain(".img-wide");
      expect(html).toContain("max-width: 100%");
      expect(html).toContain("max-height: 200px");
    });
  });

  describe("assembleAnswerKey", () => {
    it("should produce answer key HTML with correct structure", () => {
      const plan = createTestPlan();
      const html = assembleAnswerKey(plan);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("ANSWER KEY");
      expect(html).toContain("Addition Practice");
    });

    it("should include all answers", () => {
      const plan = createTestPlan();
      const html = assembleAnswerKey(plan);

      expect(html).toContain("2"); // q1 answer
      expect(html).toContain("5"); // q2 answer
      expect(html).toContain("9"); // q3 answer
    });

    it("should include explanations when provided", () => {
      const plan = createTestPlan();
      const html = assembleAnswerKey(plan);

      expect(html).toContain("1 plus 1 equals 2");
      expect(html).toContain("2 plus 3 equals 5");
    });

    it("should calculate total points", () => {
      const plan = createTestPlan();
      const html = assembleAnswerKey(plan);

      // q1=1, q2=1, q3=2 → total=4
      expect(html).toContain("4");
      expect(html).toContain("Scoring Guide");
    });

    it("should include scoring guide", () => {
      const plan = createTestPlan();
      const html = assembleAnswerKey(plan);

      expect(html).toContain("90-100%: Excellent");
      expect(html).toContain("Below 70%: Needs Review");
    });
  });

  describe("assembleLessonPlan", () => {
    it("should produce lesson plan HTML with objectives", () => {
      const plan = createTestPlan();
      const html = assembleLessonPlan(plan);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Learning Objectives");
      expect(html).toContain("Add single-digit numbers");
      expect(html).toContain("Solve word problems");
    });

    it("should include grade, subject, and time metadata", () => {
      const plan = createTestPlan();
      const html = assembleLessonPlan(plan);

      expect(html).toContain("Grade 2");
      expect(html).toContain("Math");
      expect(html).toContain("20 minutes");
    });

    it("should include lesson plan sections", () => {
      const plan = createTestPlan();
      const html = assembleLessonPlan(plan);

      expect(html).toContain("Warm-Up Activity");
      expect(html).toContain("Direct Instruction");
      expect(html).toContain("Guided Practice");
      expect(html).toContain("Independent Practice");
      expect(html).toContain("Closure");
      expect(html).toContain("Differentiation");
      expect(html).toContain("Assessment");
    });

    it("should include topic reference", () => {
      const plan = createTestPlan();
      const html = assembleLessonPlan(plan);

      expect(html).toContain("Addition");
    });
  });

  describe("assembleAll", () => {
    it("should produce all three documents when all options enabled", () => {
      const plan = createTestPlan();
      const result = assembleAll(plan, {
        includeAnswerKey: true,
        includeLessonPlan: true,
      });

      expect(result.worksheetHtml).toContain("<!DOCTYPE html>");
      expect(result.answerKeyHtml).toContain("ANSWER KEY");
      expect(result.lessonPlanHtml).toContain("Learning Objectives");
    });

    it("should omit answer key when includeAnswerKey is false", () => {
      const plan = createTestPlan();
      const result = assembleAll(plan, {
        includeAnswerKey: false,
        includeLessonPlan: true,
      });

      expect(result.worksheetHtml).toContain("<!DOCTYPE html>");
      expect(result.answerKeyHtml).toBe("");
      expect(result.lessonPlanHtml).toContain("Learning Objectives");
    });

    it("should omit lesson plan when includeLessonPlan is false", () => {
      const plan = createTestPlan();
      const result = assembleAll(plan, {
        includeAnswerKey: true,
        includeLessonPlan: false,
      });

      expect(result.worksheetHtml).toContain("<!DOCTYPE html>");
      expect(result.answerKeyHtml).toContain("ANSWER KEY");
      expect(result.lessonPlanHtml).toBe("");
    });

    it("should pass images through to assembleWorksheet", () => {
      const plan = createTestPlan({
        visualPlacements: [
          {
            afterItemId: "q1",
            description: "test image",
            purpose: "counting_support",
            size: "wide",
          },
        ],
      });
      const images = [createTestImage({ base64Data: "assembleAllImage" })];
      const result = assembleAll(plan, {
        includeAnswerKey: true,
        includeLessonPlan: true,
        images,
      });

      expect(result.worksheetHtml).toContain("assembleAllImage");
      expect(result.worksheetHtml).toContain("img-wide");
    });
  });
});

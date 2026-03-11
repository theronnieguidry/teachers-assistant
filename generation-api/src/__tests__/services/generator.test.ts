import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTeacherPack, type ProgressCallback } from "../../services/generator.js";

// Mock dependencies
vi.mock("../../services/ai-provider.js", () => ({
  generateContent: vi.fn(),
  calculateCredits: vi.fn(),
  requiresCredits: vi.fn((provider: string) => provider !== "local" && provider !== "ollama"),
  resolveModel: vi.fn(({ provider, model }: { provider: string; model?: string }) => {
    if (model) return model;
    return provider === "local" || provider === "ollama" ? "phi4-mini" : "gpt-4.1";
  }),
}));

vi.mock("../../services/inspiration-parser.js", () => ({
  parseAllInspiration: vi.fn(),
}));

vi.mock("../../services/credits.js", () => ({
  getSupabaseClient: vi.fn(),
  reserveCredits: vi.fn(),
  refundCredits: vi.fn(),
}));

vi.mock("../../services/image-service.js", () => ({
  processVisualPlaceholders: vi.fn((html: string) => Promise.resolve(html)),
}));

vi.mock("../../services/prompt-polisher.js", () => ({
  polishPrompt: vi.fn(({ prompt }: { prompt: string }) =>
    Promise.resolve({ polished: prompt, wasPolished: false })
  ),
}));

vi.mock("../../services/premium/index.js", () => ({
  createWorksheetPlan: vi.fn(),
  createFallbackPlan: vi.fn(),
  countQuestions: vi.fn(),
  validateAndRepair: vi.fn(),
  assembleAll: vi.fn(),
  runQualityGate: vi.fn(),
  getQualitySummary: vi.fn(),
}));

vi.mock("../../services/premium/image-generator.js", () => ({
  generateBatchImagesWithStats: vi.fn(),
  createImageRequestsFromPlacements: vi.fn(),
  isImageGenerationAvailable: vi.fn(() => false),
}));

vi.mock("../../services/premium/image-relevance-gate.js", () => ({
  filterAndCapPlacements: vi.fn(),
  getFilterSummary: vi.fn(),
}));

vi.mock("../../services/premium/image-compressor.js", () => ({
  compressImages: vi.fn(),
  validateOutputSize: vi.fn(),
  getCompressionStats: vi.fn(),
}));

vi.mock("../../services/premium/lesson-plan-planner.js", () => ({
  createLessonPlan: vi.fn(),
}));

vi.mock("../../services/premium/lesson-plan-validator.js", () => ({
  validateAndRepairLessonPlan: vi.fn(),
}));

vi.mock("../../services/premium/lesson-plan-assembler.js", () => ({
  assembleLessonPlanHTML: vi.fn(),
}));

import { generateContent, calculateCredits } from "../../services/ai-provider.js";
import { parseAllInspiration } from "../../services/inspiration-parser.js";
import { getSupabaseClient, reserveCredits, refundCredits } from "../../services/credits.js";
import {
  createWorksheetPlan,
  countQuestions,
  validateAndRepair,
  assembleAll,
  runQualityGate,
  getQualitySummary,
} from "../../services/premium/index.js";
import {
  generateBatchImagesWithStats,
  createImageRequestsFromPlacements,
  isImageGenerationAvailable,
} from "../../services/premium/image-generator.js";
import { createLessonPlan } from "../../services/premium/lesson-plan-planner.js";
import { validateAndRepairLessonPlan } from "../../services/premium/lesson-plan-validator.js";
import { assembleLessonPlanHTML } from "../../services/premium/lesson-plan-assembler.js";
import {
  filterAndCapPlacements,
  getFilterSummary,
} from "../../services/premium/image-relevance-gate.js";
import {
  compressImages,
  validateOutputSize,
  getCompressionStats,
} from "../../services/premium/image-compressor.js";

describe("Generator Service", () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn(),
  };

  const baseRequest = {
    projectId: "project-123",
    prompt: "Create a math worksheet about addition",
    grade: "2" as const,
    subject: "Math",
    options: {
      questionCount: 10,
      includeVisuals: true,
      difficulty: "medium" as const,
      format: "worksheet" as const,
      includeAnswerKey: true,
    },
    inspiration: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as never);
    vi.mocked(reserveCredits).mockResolvedValue(true);
    vi.mocked(refundCredits).mockResolvedValue(undefined);
    vi.mocked(parseAllInspiration).mockResolvedValue([]);
    vi.mocked(calculateCredits).mockReturnValue(3);

    // Reset mock chain
    mockSupabase.from.mockReturnThis();
    mockSupabase.update.mockReturnThis();
    mockSupabase.insert.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.order.mockReturnThis();
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });
    mockSupabase.single.mockResolvedValue({
      data: { id: "version-456" },
      error: null,
    });

    // Mock AI responses
    vi.mocked(generateContent).mockResolvedValue({
      content: "<h1>Test Worksheet</h1><p>Question 1</p>",
      inputTokens: 100,
      outputTokens: 200,
    });
  });

  describe("generateTeacherPack", () => {
    it("should reserve credits before generation", async () => {
      await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai" }
      );

      expect(reserveCredits).toHaveBeenCalledWith("user-123", 5, "project-123");
    });

    it("should throw error when insufficient credits", async () => {
      vi.mocked(reserveCredits).mockResolvedValue(false);

      await expect(
        generateTeacherPack(baseRequest, "user-123", { aiProvider: "openai" })
      ).rejects.toThrow("Insufficient credits");
    });

    it("should update project status to generating", async () => {
      await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai" }
      );

      expect(mockSupabase.from).toHaveBeenCalledWith("projects");
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: "generating" });
    });

    it("should generate worksheet content", async () => {
      const result = await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai" }
      );

      expect(result.worksheetHtml).toContain("Test Worksheet");
      expect(generateContent).toHaveBeenCalled();
    });

    it("should generate answer key when includeAnswerKey is true", async () => {
      await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai" }
      );

      // Should be called twice: worksheet + answer key
      expect(generateContent).toHaveBeenCalledTimes(2);
    });

    it("should skip answer key when includeAnswerKey is false", async () => {
      const request = {
        ...baseRequest,
        options: { ...baseRequest.options, includeAnswerKey: false },
      };

      await generateTeacherPack(
        request,
        "user-123",
        { aiProvider: "openai" }
      );

      // Should only be called once for worksheet
      expect(generateContent).toHaveBeenCalledTimes(1);
    });

    it("should generate lesson plan when format is both", async () => {
      const request = {
        ...baseRequest,
        options: { ...baseRequest.options, format: "both" as const },
      };

      await generateTeacherPack(
        request,
        "user-123",
        { aiProvider: "openai" }
      );

      // worksheet + lesson plan + answer key
      expect(generateContent).toHaveBeenCalledTimes(3);
    });

    it("should parse inspiration materials when provided", async () => {
      const request = {
        ...baseRequest,
        inspiration: [
          { id: "insp-1", type: "url" as const, title: "Example", sourceUrl: "https://example.com" },
        ],
      };

      await generateTeacherPack(
        request,
        "user-123",
        { aiProvider: "openai" }
      );

      expect(parseAllInspiration).toHaveBeenCalledWith(
        request.inspiration,
        expect.objectContaining({ provider: "openai" })
      );
    });

    it("should save project version to database", async () => {
      await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai" }
      );

      expect(mockSupabase.from).toHaveBeenCalledWith("project_versions");
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: "project-123",
          ai_provider: "openai",
        })
      );
    });

    it("should return generation result with all fields", async () => {
      const result = await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai" }
      );

      expect(result).toMatchObject({
        projectId: "project-123",
        versionId: "version-456",
        worksheetHtml: expect.any(String),
        creditsUsed: 3,
      });
    });

    it("should call progress callback at each step", async () => {
      const onProgress = vi.fn();

      await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai" },
        onProgress
      );

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ step: "worksheet", message: expect.any(String) })
      );
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ step: "answer_key", message: expect.any(String) })
      );
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ step: "complete", progress: 100 })
      );
    });

    it("should refund credits and update status on error", async () => {
      vi.mocked(generateContent).mockRejectedValue(new Error("AI error"));

      await expect(
        generateTeacherPack(baseRequest, "user-123", { aiProvider: "openai" })
      ).rejects.toThrow("AI error");

      expect(refundCredits).toHaveBeenCalledWith(
        "user-123",
        5,
        "project-123",
        expect.stringContaining("Generation failed")
      );

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          error_message: "AI error",
        })
      );
    });

    it("should refund difference when actual credits less than reserved", async () => {
      vi.mocked(calculateCredits).mockReturnValue(2); // Less than 5 reserved

      await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai" }
      );

      expect(refundCredits).toHaveBeenCalledWith(
        "user-123",
        3, // 5 - 2
        "project-123",
        "Actual usage less than reserved"
      );
    });

    it("should extract HTML from code blocks", async () => {
      vi.mocked(generateContent).mockResolvedValue({
        content: "```html\n<div>Content</div>\n```",
        inputTokens: 50,
        outputTokens: 100,
      });

      const result = await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai" }
      );

      expect(result.worksheetHtml).toBe("<div>Content</div>");
    });

    it("should wrap plain text in HTML structure", async () => {
      vi.mocked(generateContent).mockResolvedValue({
        content: "Just some plain text content",
        inputTokens: 50,
        outputTokens: 100,
      });

      const result = await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai" }
      );

      expect(result.worksheetHtml).toContain("<!DOCTYPE html>");
      expect(result.worksheetHtml).toContain("Just some plain text content");
    });

    it("should use custom model when provided", async () => {
      await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai", model: "gpt-4" }
      );

      expect(generateContent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          provider: "openai",
          model: "gpt-4",
        })
      );
    });

    it("should persist the resolved default model when no model override is provided", async () => {
      await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai" }
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ai_model: "gpt-4.1",
        })
      );
    });

    it("should not include imageStats in standard pipeline result", async () => {
      const result = await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "openai" }
      );

      expect(result.imageStats).toBeUndefined();
    });
  });

  describe("generateTeacherPack - premium pipeline", () => {
    const mockPlan = {
      version: "1.0" as const,
      metadata: {
        title: "Addition Practice",
        grade: "2" as const,
        subject: "Math",
        topic: "Addition",
        learningObjectives: ["Add single-digit numbers"],
        estimatedTime: "15 minutes",
      },
      structure: {
        header: {
          title: "Addition Practice",
          hasNameLine: true,
          hasDateLine: true,
          instructions: "Solve the problems below.",
        },
        sections: [{
          id: "s1",
          type: "questions" as const,
          title: "Addition",
          items: [{
            id: "q1",
            questionText: "2 + 3 = ?",
            questionType: "fill_blank" as const,
            correctAnswer: "5",
          }],
        }],
      },
      style: {
        difficulty: "medium" as const,
        visualStyle: "standard" as const,
      },
      visualPlacements: [{
        afterItemId: "q1",
        description: "Counting blocks showing 2 + 3",
        purpose: "counting_support" as const,
        size: "small" as const,
      }],
    };

    const premiumConfig = {
      aiProvider: "openai" as const,
      generationMode: "premium_plan_pipeline" as const,
      visualSettings: {
        includeVisuals: true,
        richness: "standard" as const,
        style: "friendly_cartoon" as const,
      },
    };

    const mockRelevanceStats = {
      total: 1,
      accepted: 1,
      rejected: 0,
      cap: 5,
      byPurpose: { counting_support: 1 },
    };

    const mockImageStats = {
      total: 1,
      generated: 1,
      cached: 0,
      failed: 0,
    };

    function setupPremiumMocks() {
      vi.mocked(createWorksheetPlan).mockResolvedValue({
        plan: mockPlan,
        inputTokens: 500,
        outputTokens: 1000,
      });
      vi.mocked(countQuestions).mockReturnValue(1);
      vi.mocked(validateAndRepair).mockResolvedValue({
        plan: mockPlan,
        wasRepaired: false,
      });
      vi.mocked(assembleAll).mockReturnValue({
        worksheetHtml: "<html><body>Worksheet</body></html>",
        lessonPlanHtml: "",
        answerKeyHtml: "<html><body>Answers</body></html>",
      });
      vi.mocked(runQualityGate).mockResolvedValue({
        passed: true,
        score: 85,
        issues: [],
        shouldCharge: true,
      });
      vi.mocked(getQualitySummary).mockReturnValue("Score: 85/100");
      vi.mocked(isImageGenerationAvailable).mockReturnValue(true);
      vi.mocked(filterAndCapPlacements).mockReturnValue({
        accepted: mockPlan.visualPlacements!,
        rejected: [],
        stats: mockRelevanceStats,
      });
      vi.mocked(getFilterSummary).mockReturnValue("1 accepted, 0 rejected");
      vi.mocked(createImageRequestsFromPlacements).mockReturnValue([{
        prompt: "counting blocks",
        style: "friendly_cartoon" as const,
        size: "small" as const,
        placementId: "q1",
      }]);
      vi.mocked(generateBatchImagesWithStats).mockResolvedValue({
        images: [{
          base64Data: "abc123",
          mediaType: "image/png",
          width: 256,
          height: 256,
          placementId: "q1",
        }],
        stats: mockImageStats,
      });
      vi.mocked(compressImages).mockResolvedValue([{
        base64Data: "abc123compressed",
        mediaType: "image/png",
        width: 256,
        height: 256,
        placementId: "q1",
      }]);
      vi.mocked(validateOutputSize).mockReturnValue({
        valid: true,
        totalSize: 1024,
        recommendation: "",
      });
      vi.mocked(getCompressionStats).mockReturnValue({
        totalOriginal: 2048,
        totalCompressed: 1024,
        averageRatio: 0.5,
        count: 1,
      });
    }

    it("should include imageStats when images are generated", async () => {
      setupPremiumMocks();

      const result = await generateTeacherPack(
        baseRequest,
        "user-123",
        premiumConfig
      );

      expect(result.imageStats).toEqual({
        total: 1,
        generated: 1,
        cached: 0,
        failed: 0,
        relevance: {
          total: 1,
          accepted: 1,
          rejected: 0,
          cap: 5,
          byPurpose: { counting_support: 1 },
        },
      });
    });

    it("should return zero imageStats when visuals are disabled", async () => {
      setupPremiumMocks();

      const result = await generateTeacherPack(
        baseRequest,
        "user-123",
        {
          ...premiumConfig,
          visualSettings: {
            includeVisuals: false,
            richness: "minimal" as const,
            style: "friendly_cartoon" as const,
          },
        }
      );

      expect(result.imageStats).toEqual({
        total: 0,
        generated: 0,
        cached: 0,
        failed: 0,
        relevance: null,
      });
    });

    it("should return zero imageStats when image generation is unavailable", async () => {
      setupPremiumMocks();
      vi.mocked(isImageGenerationAvailable).mockReturnValue(false);

      const result = await generateTeacherPack(
        baseRequest,
        "user-123",
        premiumConfig
      );

      expect(result.imageStats).toEqual({
        total: 0,
        generated: 0,
        cached: 0,
        failed: 0,
        relevance: null,
      });
    });

    it("should retry project version save without unsupported metadata columns", async () => {
      setupPremiumMocks();
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: "plan-123" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: {
            code: "PGRST204",
            message:
              "Could not find the 'generation_mode' column of 'project_versions' in the schema cache",
          },
        })
        .mockResolvedValueOnce({
          data: { id: "version-789" },
          error: null,
        });

      const result = await generateTeacherPack(
        baseRequest,
        "user-123",
        premiumConfig
      );

      const versionInsertCalls = mockSupabase.insert.mock.calls
        .map(([payload]) => payload as Record<string, unknown>)
        .filter((payload) => payload.project_id === "project-123" && payload.ai_provider);

      expect(result.versionId).toBe("version-789");
      expect(versionInsertCalls).toHaveLength(2);
      expect(versionInsertCalls[0]).toMatchObject({
        generation_mode: "premium_plan_pipeline",
        ai_provider: "openai",
      });
      expect(versionInsertCalls[1]).not.toHaveProperty("generation_mode");
      expect(versionInsertCalls[1]).toMatchObject({
        ai_provider: "openai",
      });
    });
  });

  describe("generateTeacherPack - premium lesson plan pipeline", () => {
    const lessonPlanRequest = {
      ...baseRequest,
      options: {
        ...baseRequest.options,
        format: "both" as const,
        lessonLength: 30 as const,
        teachingConfidence: "novice" as const,
        studentProfile: ["needs_movement"] as const,
      },
    };

    const lessonPlanConfig = {
      aiProvider: "openai" as const,
      generationMode: "premium_lesson_plan_pipeline" as const,
      visualSettings: {
        includeVisuals: true,
        richness: "minimal" as const,
        style: "friendly_cartoon" as const,
      },
    };

    const mockLessonPlan = {
      version: "1.0" as const,
      metadata: {
        objective: "Add within 20",
        grade: "2" as const,
        subject: "Math",
        durationMinutes: 30 as const,
        priorKnowledge: ["Count within 20"],
        successCriteria: "Students solve addition problems correctly",
      },
      sections: [
        {
          type: "warmup" as const,
          title: "Warm Up",
          durationMinutes: 5,
          description: "Review",
          teacherScript: [{ action: "say" as const, text: "Let us warm up." }],
          activities: ["Count together"],
        },
        {
          type: "instruction" as const,
          title: "Teach",
          durationMinutes: 10,
          description: "Model addition",
          teacherScript: [{ action: "say" as const, text: "Watch me add." }],
          activities: ["Model examples"],
        },
        {
          type: "guided_practice" as const,
          title: "Practice Together",
          durationMinutes: 5,
          description: "Guided work",
          teacherScript: [{ action: "say" as const, text: "Try one with me." }],
          activities: ["Solve together"],
        },
        {
          type: "independent_practice" as const,
          title: "Independent Work",
          durationMinutes: 7,
          description: "Students practice",
          teacherScript: [{ action: "say" as const, text: "Try these on your own." }],
          activities: ["Solve worksheet"],
        },
        {
          type: "closure" as const,
          title: "Close",
          durationMinutes: 3,
          description: "Wrap up",
          teacherScript: [{ action: "say" as const, text: "What did we learn?" }],
          activities: ["Reflect"],
        },
      ],
      materials: [{ name: "Pencil", optional: false }],
      differentiation: {
        forStruggling: ["Use counters"],
        forAdvanced: ["Challenge problem"],
        forELL: ["Use visuals"],
      },
      accommodations: [],
    };

    beforeEach(() => {
      vi.mocked(createLessonPlan).mockResolvedValue({
        plan: mockLessonPlan,
        inputTokens: 220,
        outputTokens: 380,
      });
      vi.mocked(validateAndRepairLessonPlan).mockResolvedValue({
        plan: mockLessonPlan,
        validationResult: {
          valid: true,
          issues: [],
          autoRepairable: false,
        },
        wasRepaired: false,
      });
      vi.mocked(assembleLessonPlanHTML).mockReturnValue({
        lessonPlanHtml: "<html><body>Lesson plan</body></html>",
        teacherScriptHtml: "<html><body>Teacher script</body></html>",
        studentActivityHtml: null,
        materialsListHtml: "<html><body>Materials</body></html>",
        lessonMetadata: {
          objective: "Add within 20",
          lessonLength: 30,
          teachingConfidence: "novice",
          studentProfile: ["needs_movement"],
          sectionsGenerated: ["warmup", "instruction"],
        },
      });
      vi.mocked(createWorksheetPlan).mockResolvedValue({
        plan: {
          version: "1.0" as const,
          metadata: {
            title: "Aligned Worksheet",
            grade: "2" as const,
            subject: "Math",
            topic: "Addition",
            learningObjectives: ["Add within 20"],
            estimatedTime: "15 minutes",
          },
          structure: {
            header: {
              title: "Aligned Worksheet",
              hasNameLine: true,
              hasDateLine: true,
              instructions: "Solve the problems.",
            },
            sections: [],
          },
          style: {
            difficulty: "medium" as const,
            visualStyle: "minimal" as const,
          },
        },
        inputTokens: 120,
        outputTokens: 180,
      });
      vi.mocked(validateAndRepair).mockResolvedValue({
        plan: {
          version: "1.0" as const,
          metadata: {
            title: "Aligned Worksheet",
            grade: "2" as const,
            subject: "Math",
            topic: "Addition",
            learningObjectives: ["Add within 20"],
            estimatedTime: "15 minutes",
          },
          structure: {
            header: {
              title: "Aligned Worksheet",
              hasNameLine: true,
              hasDateLine: true,
              instructions: "Solve the problems.",
            },
            sections: [],
          },
          style: {
            difficulty: "medium" as const,
            visualStyle: "minimal" as const,
          },
        },
        wasRepaired: false,
      });
      vi.mocked(assembleAll).mockReturnValue({
        worksheetHtml: "<html><body>Worksheet</body></html>",
        lessonPlanHtml: "",
        answerKeyHtml: "<html><body>Answer key</body></html>",
      });
    });

    it("should pass the full lesson-plan context and token accounting through the premium lesson plan pipeline", async () => {
      const result = await generateTeacherPack(
        lessonPlanRequest,
        "user-123",
        lessonPlanConfig
      );

      expect(createLessonPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "project-123",
          options: lessonPlanRequest.options,
          visualSettings: lessonPlanConfig.visualSettings,
          lessonLength: 30,
          teachingConfidence: "novice",
          studentProfile: ["needs_movement"],
        }),
        expect.any(Object)
      );
      expect(validateAndRepairLessonPlan).toHaveBeenCalledWith(
        mockLessonPlan,
        expect.objectContaining({
          lessonLength: 30,
          grade: "2",
          subject: "Math",
          teachingConfidence: "novice",
          studentProfile: ["needs_movement"],
          includeTeacherScript: true,
        }),
        expect.any(Object)
      );
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          teacher_script_html: "<html><body>Teacher script</body></html>",
          materials_list_html: "<html><body>Materials</body></html>",
          ai_model: "gpt-4.1",
          input_tokens: 340,
          output_tokens: 560,
        })
      );
      expect(result.teacherScriptHtml).toBe("<html><body>Teacher script</body></html>");
      expect(result.studentActivityHtml).toBeUndefined();
      expect(result.materialsListHtml).toBe("<html><body>Materials</body></html>");
    });
  });
});

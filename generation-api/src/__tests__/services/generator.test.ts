import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTeacherPack, type ProgressCallback } from "../../services/generator.js";

// Mock dependencies
vi.mock("../../services/ai-provider.js", () => ({
  generateContent: vi.fn(),
  calculateCredits: vi.fn(),
}));

vi.mock("../../services/inspiration-parser.js", () => ({
  parseAllInspiration: vi.fn(),
}));

vi.mock("../../services/credits.js", () => ({
  getSupabaseClient: vi.fn(),
  reserveCredits: vi.fn(),
  refundCredits: vi.fn(),
}));

import { generateContent, calculateCredits } from "../../services/ai-provider.js";
import { parseAllInspiration } from "../../services/inspiration-parser.js";
import { getSupabaseClient, reserveCredits, refundCredits } from "../../services/credits.js";

describe("Generator Service", () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
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
        { aiProvider: "claude" }
      );

      expect(reserveCredits).toHaveBeenCalledWith("user-123", 5, "project-123");
    });

    it("should throw error when insufficient credits", async () => {
      vi.mocked(reserveCredits).mockResolvedValue(false);

      await expect(
        generateTeacherPack(baseRequest, "user-123", { aiProvider: "claude" })
      ).rejects.toThrow("Insufficient credits");
    });

    it("should update project status to generating", async () => {
      await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "claude" }
      );

      expect(mockSupabase.from).toHaveBeenCalledWith("projects");
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: "generating" });
    });

    it("should generate worksheet content", async () => {
      const result = await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "claude" }
      );

      expect(result.worksheetHtml).toContain("Test Worksheet");
      expect(generateContent).toHaveBeenCalled();
    });

    it("should generate answer key when includeAnswerKey is true", async () => {
      await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "claude" }
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
        { aiProvider: "claude" }
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
        { aiProvider: "claude" }
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
        { aiProvider: "claude" }
      );

      expect(parseAllInspiration).toHaveBeenCalledWith(
        request.inspiration,
        expect.objectContaining({ provider: "claude" })
      );
    });

    it("should save project version to database", async () => {
      await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "claude" }
      );

      expect(mockSupabase.from).toHaveBeenCalledWith("project_versions");
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: "project-123",
          ai_provider: "claude",
        })
      );
    });

    it("should return generation result with all fields", async () => {
      const result = await generateTeacherPack(
        baseRequest,
        "user-123",
        { aiProvider: "claude" }
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
        { aiProvider: "claude" },
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
        generateTeacherPack(baseRequest, "user-123", { aiProvider: "claude" })
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
        { aiProvider: "claude" }
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
        { aiProvider: "claude" }
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
        { aiProvider: "claude" }
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
  });
});

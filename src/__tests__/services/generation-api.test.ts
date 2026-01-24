import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateTeacherPack,
  getCredits,
  generatePdf,
  checkHealth,
  GenerationApiError,
} from "@/services/generation-api";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Generation API Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("generateTeacherPack", () => {
    const mockRequest = {
      projectId: "project-123",
      prompt: "Create a math worksheet",
      grade: "2" as const,
      subject: "Math",
      options: {},
      inspiration: [],
    };

    it("should call the generate endpoint with correct data", async () => {
      const mockResult = {
        projectId: "project-123",
        versionId: "version-456",
        worksheetHtml: "<p>Worksheet</p>",
        lessonPlanHtml: "<p>Lesson</p>",
        answerKeyHtml: "<p>Answers</p>",
        creditsUsed: 5,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "application/json",
        },
        json: () => Promise.resolve({ result: mockResult }),
      });

      const result = await generateTeacherPack(mockRequest, "test-token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/generate"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );

      expect(result).toEqual(mockResult);
    });

    it("should throw GenerationApiError on 402", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 402,
        json: () => Promise.resolve({ error: "Insufficient credits" }),
      });

      await expect(
        generateTeacherPack(mockRequest, "test-token")
      ).rejects.toThrow(GenerationApiError);

      await expect(
        generateTeacherPack(mockRequest, "test-token")
      ).rejects.toMatchObject({
        statusCode: 402,
        message: "Insufficient credits",
      });
    });

    it("should throw GenerationApiError on other errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      await expect(
        generateTeacherPack(mockRequest, "test-token")
      ).rejects.toThrow(GenerationApiError);
    });
  });

  describe("getCredits", () => {
    it("should fetch and return user credits", async () => {
      const mockCredits = {
        balance: 50,
        lifetimeGranted: 100,
        lifetimeUsed: 50,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ credits: mockCredits }),
      });

      const result = await getCredits("test-token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/credits"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );

      expect(result).toEqual(mockCredits);
    });

    it("should throw on error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });

      await expect(getCredits("invalid-token")).rejects.toThrow(
        GenerationApiError
      );
    });
  });

  describe("generatePdf", () => {
    it("should send HTML and return blob", async () => {
      const mockBlob = new Blob(["pdf content"], { type: "application/pdf" });

      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await generatePdf("<p>Content</p>", "test-token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/pdf"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ html: "<p>Content</p>" }),
        })
      );

      expect(result).toEqual(mockBlob);
    });

    it("should throw on error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: "Service unavailable" }),
      });

      await expect(generatePdf("<p>Test</p>", "test-token")).rejects.toThrow(
        GenerationApiError
      );
    });
  });

  describe("checkHealth", () => {
    it("should return true when healthy", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await checkHealth();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/health")
      );
    });

    it("should return false when unhealthy", async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await checkHealth();

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await checkHealth();

      expect(result).toBe(false);
    });
  });
});

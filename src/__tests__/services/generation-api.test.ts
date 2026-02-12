import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateTeacherPack,
  getCredits,
  generatePdf,
  checkHealth,
  polishPrompt,
  GenerationApiError,
} from "@/services/generation-api";
import { TIMEOUTS } from "@/lib/async-utils";

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

    it("should include designPackContext when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "application/json",
        },
        json: () =>
          Promise.resolve({
            result: {
              projectId: "project-123",
              versionId: "version-456",
              worksheetHtml: "<p>Worksheet</p>",
              lessonPlanHtml: "",
              answerKeyHtml: "",
              creditsUsed: 5,
            },
          }),
      });

      await generateTeacherPack(
        {
          ...mockRequest,
          designPackContext: {
            packId: "pack-1",
            items: [
              {
                id: "pack:pack-1:item-1",
                type: "url",
                title: "Pack Link",
                sourceUrl: "https://example.com/pack-link",
              },
            ],
          },
        },
        "test-token"
      );

      const fetchArgs = mockFetch.mock.calls[0]?.[1] as { body?: string };
      const body = fetchArgs?.body ? JSON.parse(fetchArgs.body) : {};
      expect(body.designPackContext).toEqual({
        packId: "pack-1",
        items: [
          {
            id: "pack:pack-1:item-1",
            type: "url",
            title: "Pack Link",
            sourceUrl: "https://example.com/pack-link",
          },
        ],
      });
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

  describe("polishPrompt", () => {
    const mockContext = {
      prompt: "Math fractions",
      grade: "3" as const,
      subject: "Math",
      format: "worksheet" as const,
      questionCount: 10,
      difficulty: "medium" as const,
      includeVisuals: true,
    };

    it("should send correct request body and return polished result", async () => {
      const mockResult = {
        original: "Math fractions",
        polished: "Create a comprehensive 3rd grade math worksheet...",
        wasPolished: true,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await polishPrompt(mockContext, "test-token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/polish"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
          body: JSON.stringify(mockContext),
        })
      );

      expect(result).toEqual(mockResult);
    });

    it("should return graceful fallback on error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      const result = await polishPrompt(mockContext, "test-token");

      // Should return original prompt as fallback
      expect(result).toEqual({
        original: "Math fractions",
        polished: "Math fractions",
        wasPolished: false,
      });
    });

    it("should include inspirationTitles when provided", async () => {
      const contextWithInspiration = {
        ...mockContext,
        inspirationTitles: ["Math Article", "PDF Guide"],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          original: "Math fractions",
          polished: "Enhanced prompt",
          wasPolished: true,
        }),
      });

      await polishPrompt(contextWithInspiration, "test-token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining("inspirationTitles"),
        })
      );
    });

    it("should handle wasPolished: false response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          original: "Already detailed prompt",
          polished: "Already detailed prompt",
          wasPolished: false,
        }),
      });

      const result = await polishPrompt(
        { ...mockContext, prompt: "Already detailed prompt" },
        "test-token"
      );

      expect(result.wasPolished).toBe(false);
      expect(result.original).toBe(result.polished);
    });
  });

  describe("SSE streaming", () => {
    const mockRequest = {
      projectId: "project-123",
      prompt: "Create a math worksheet",
      grade: "2" as const,
      subject: "Math",
      options: {},
      inspiration: [],
    };

    it("should parse SSE progress events", async () => {
      const progressEvents: Array<{ step: string; progress: number; message: string }> = [];

      // Create a mock ReadableStream
      const sseData = [
        'data: {"type":"progress","step":"worksheet","progress":25,"message":"Generating worksheet..."}',
        'data: {"type":"progress","step":"worksheet","progress":50,"message":"Almost done..."}',
        'data: {"type":"complete","result":{"projectId":"project-123","versionId":"v-1","worksheetHtml":"<p>Done</p>","lessonPlanHtml":"","answerKeyHtml":"","creditsUsed":5}}',
      ].join("\n");

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseData));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "text/event-stream",
        },
        body: stream,
      });

      const result = await generateTeacherPack(
        mockRequest,
        "test-token",
        (progress) => progressEvents.push(progress)
      );

      expect(progressEvents).toHaveLength(2);
      expect(progressEvents[0]).toEqual({
        step: "worksheet",
        progress: 25,
        message: "Generating worksheet...",
      });
      expect(result.projectId).toBe("project-123");
      expect(result.creditsUsed).toBe(5);
    });

    it("should throw on SSE error event", async () => {
      const sseData = 'data: {"type":"error","message":"Generation failed due to API error"}';

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseData));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "text/event-stream",
        },
        body: stream,
      });

      await expect(
        generateTeacherPack(mockRequest, "test-token")
      ).rejects.toThrow("Generation failed due to API error");
    });

    it("preserves quality report details from SSE error events", async () => {
      const sseData =
        'data: {"type":"error","message":"Quality check failed","statusCode":422,"code":"quality_gate_failed","qualityReport":{"summary":"Quality checks failed","retrySuggestion":"Retry","issues":[]}}';

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseData));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "text/event-stream",
        },
        body: stream,
      });

      await expect(
        generateTeacherPack(mockRequest, "test-token")
      ).rejects.toMatchObject({
        statusCode: 422,
        details: expect.objectContaining({
          code: "quality_gate_failed",
          qualityReport: expect.objectContaining({
            summary: "Quality checks failed",
          }),
        }),
      });
    });

    it("should throw when no result received from stream", async () => {
      const sseData = 'data: {"type":"progress","step":"worksheet","progress":25,"message":"Working..."}';

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(sseData));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => "text/event-stream",
        },
        body: stream,
      });

      await expect(
        generateTeacherPack(mockRequest, "test-token")
      ).rejects.toThrow("No result received");
    });
  });

  describe("fetch timeout handling", () => {
    it("should throw GenerationApiError on fetch timeout", async () => {
      // Create an AbortError to simulate timeout
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";

      mockFetch.mockRejectedValue(abortError);

      await expect(getCredits("test-token")).rejects.toThrow(GenerationApiError);
      await expect(getCredits("test-token")).rejects.toMatchObject({
        statusCode: 504,
        message: expect.stringContaining("timed out"),
      });
    });

    it("should pass abort signal to fetch", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ credits: { balance: 50 } }),
      });

      await getCredits("test-token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe("streaming timeout constants", () => {
    it("should have reasonable timeout values", () => {
      // Verify timeout constants are reasonable
      expect(TIMEOUTS.STREAMING_IDLE).toBe(30000); // 30 seconds
      expect(TIMEOUTS.STREAMING_TOTAL).toBe(300000); // 5 minutes
      expect(TIMEOUTS.FETCH_DEFAULT).toBe(30000); // 30 seconds
    });
  });
});

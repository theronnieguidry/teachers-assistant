import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  submitFeedback,
  type FeedbackRequest,
  type FeedbackResponse,
} from "@/services/feedback-api";
import { GenerationApiError } from "@/services/generation-api";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Feedback API Service", () => {
  const mockAccessToken = "test-access-token";
  const mockRequest: FeedbackRequest = {
    type: "bug",
    title: "Test bug report",
    description: "This is a detailed bug description for testing",
    contactEmail: "test@example.com",
    appVersion: "1.0.0",
  };

  const mockResponse: FeedbackResponse = {
    success: true,
    issueNumber: 42,
    issueUrl: "https://github.com/owner/repo/issues/42",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("submitFeedback", () => {
    it("should call /feedback with correct body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await submitFeedback(mockRequest, mockAccessToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/feedback"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(mockRequest),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });

    it("should return success response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await submitFeedback(mockRequest, mockAccessToken);

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.issueNumber).toBe(42);
      expect(result.issueUrl).toContain("issues/42");
    });

    it("should throw GenerationApiError on error responses", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Invalid feedback data" }),
      });

      await expect(
        submitFeedback(mockRequest, mockAccessToken)
      ).rejects.toThrow(GenerationApiError);
      await expect(
        submitFeedback(mockRequest, mockAccessToken)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid feedback data",
      });
    });

    it("should send Authorization header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await submitFeedback(mockRequest, mockAccessToken);

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBe(
        `Bearer ${mockAccessToken}`
      );
    });

    it("should handle JSON parse errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Parse error")),
      });

      await expect(
        submitFeedback(mockRequest, mockAccessToken)
      ).rejects.toThrow(GenerationApiError);
      await expect(
        submitFeedback(mockRequest, mockAccessToken)
      ).rejects.toMatchObject({
        message: "Failed to submit feedback",
      });
    });

    it("should validate request body shape", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await submitFeedback(mockRequest, mockAccessToken);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body).toHaveProperty("type");
      expect(body).toHaveProperty("title");
      expect(body).toHaveProperty("description");
    });

    it("should work with feature request type", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const featureRequest: FeedbackRequest = {
        type: "feature",
        title: "Add dark mode",
        description: "Please add a dark mode option",
      };

      await submitFeedback(featureRequest, mockAccessToken);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.type).toBe("feature");
    });

    it("should include details in error when available", async () => {
      const errorDetails = { field: "title", issue: "Too short" };
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: "Validation failed",
            details: errorDetails,
          }),
      });

      try {
        await submitFeedback(mockRequest, mockAccessToken);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(GenerationApiError);
        expect((error as GenerationApiError).details).toEqual(errorDetails);
      }
    });

    it("should work without optional fields", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const minimalRequest: FeedbackRequest = {
        type: "bug",
        title: "Minimal bug",
        description: "Just the required fields",
      };

      const result = await submitFeedback(minimalRequest, mockAccessToken);

      expect(result).toEqual(mockResponse);
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body).not.toHaveProperty("contactEmail");
      expect(body).not.toHaveProperty("appVersion");
    });

    it("should use AbortController signal for timeout", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await submitFeedback(mockRequest, mockAccessToken);

      const fetchCall = mockFetch.mock.calls[0];
      // Verify signal is passed (AbortController is used)
      expect(fetchCall[1]).toHaveProperty("signal");
    });

    it("should throw 504 on timeout/abort", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      await expect(
        submitFeedback(mockRequest, mockAccessToken)
      ).rejects.toThrow(GenerationApiError);
      await expect(
        submitFeedback(mockRequest, mockAccessToken)
      ).rejects.toMatchObject({
        statusCode: 504,
        message: "Request timed out",
      });
    });
  });
});

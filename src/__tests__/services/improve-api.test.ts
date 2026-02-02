import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  applyImprovement,
  getImprovementEstimate,
  ImproveApiError,
  IMPROVEMENT_OPTIONS,
  type ImproveRequest,
} from "@/services/improve-api";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Improve API Service", () => {
  const mockAccessToken = "test-access-token";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("applyImprovement", () => {
    const mockRequest: ImproveRequest = {
      projectId: "project-123",
      versionId: "version-456",
      improvementType: "fix_confusing",
      targetDocument: "worksheet",
      additionalInstructions: "Focus on the word problems",
    };

    const mockResponse = {
      newVersionId: "version-789",
      improvedHtml: "<p>Improved content</p>",
      creditsUsed: 1,
      changes: ["Reworded question 3", "Simplified question 5"],
    };

    it("should call /improve with correct request body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await applyImprovement(mockRequest, mockAccessToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/improve"),
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

    it("should return ImprovementResponse on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await applyImprovement(mockRequest, mockAccessToken);

      expect(result).toEqual(mockResponse);
      expect(result).toHaveProperty("newVersionId");
      expect(result).toHaveProperty("improvedHtml");
      expect(result).toHaveProperty("creditsUsed");
    });

    it("should throw ImproveApiError with 402 for insufficient credits", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 402,
        json: () =>
          Promise.resolve({
            error: "Not enough credits",
            required: 3,
            available: 1,
          }),
      });

      await expect(
        applyImprovement(mockRequest, mockAccessToken)
      ).rejects.toThrow(ImproveApiError);
      await expect(
        applyImprovement(mockRequest, mockAccessToken)
      ).rejects.toMatchObject({
        statusCode: 402,
        message: "Insufficient credits",
      });
    });

    it("should throw ImproveApiError on other errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      await expect(
        applyImprovement(mockRequest, mockAccessToken)
      ).rejects.toThrow(ImproveApiError);
      await expect(
        applyImprovement(mockRequest, mockAccessToken)
      ).rejects.toMatchObject({
        statusCode: 500,
        message: "Server error",
      });
    });

    it("should include details in error when available", async () => {
      const errorDetails = {
        error: "Validation failed",
        details: { field: "improvementType", issue: "Invalid type" },
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve(errorDetails),
      });

      try {
        await applyImprovement(mockRequest, mockAccessToken);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ImproveApiError);
        expect((error as ImproveApiError).details).toEqual(errorDetails.details);
      }
    });

    it("should send Authorization header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await applyImprovement(mockRequest, mockAccessToken);

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBe(
        `Bearer ${mockAccessToken}`
      );
    });

    it("should handle JSON parse errors gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Parse error")),
      });

      await expect(
        applyImprovement(mockRequest, mockAccessToken)
      ).rejects.toThrow(ImproveApiError);
      await expect(
        applyImprovement(mockRequest, mockAccessToken)
      ).rejects.toMatchObject({
        message: "Improvement failed",
      });
    });
  });

  describe("getImprovementEstimate", () => {
    const mockEstimate = {
      improvementType: "add_questions",
      creditCost: 3,
      description: "Add 3-5 more practice questions on the same topic",
    };

    it("should call /improve/estimate with type query param", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockEstimate),
      });

      await getImprovementEstimate("add_questions", mockAccessToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/improve\/estimate\?type=add_questions$/),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });

    it("should return ImproveEstimate on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockEstimate),
      });

      const result = await getImprovementEstimate(
        "add_questions",
        mockAccessToken
      );

      expect(result).toEqual(mockEstimate);
      expect(result).toHaveProperty("improvementType", "add_questions");
      expect(result).toHaveProperty("creditCost", 3);
      expect(result).toHaveProperty("description");
    });

    it("should throw ImproveApiError on failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Invalid improvement type" }),
      });

      await expect(
        getImprovementEstimate("invalid_type" as never, mockAccessToken)
      ).rejects.toThrow(ImproveApiError);
      await expect(
        getImprovementEstimate("invalid_type" as never, mockAccessToken)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid improvement type",
      });
    });

    it("should send Authorization header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockEstimate),
      });

      await getImprovementEstimate("fix_confusing", mockAccessToken);

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBe(
        `Bearer ${mockAccessToken}`
      );
    });

    it("should handle JSON parse errors gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Parse error")),
      });

      await expect(
        getImprovementEstimate("simplify", mockAccessToken)
      ).rejects.toThrow(ImproveApiError);
      await expect(
        getImprovementEstimate("simplify", mockAccessToken)
      ).rejects.toMatchObject({
        message: "Failed to get estimate",
      });
    });
  });

  describe("IMPROVEMENT_OPTIONS constant", () => {
    it("should have all 6 improvement types", async () => {
      expect(IMPROVEMENT_OPTIONS).toHaveLength(6);

      const types = IMPROVEMENT_OPTIONS.map((opt) => opt.type);
      expect(types).toContain("fix_confusing");
      expect(types).toContain("simplify");
      expect(types).toContain("add_questions");
      expect(types).toContain("add_visuals");
      expect(types).toContain("make_harder");
      expect(types).toContain("make_easier");
    });

    it("should have required fields for each option", async () => {
      for (const option of IMPROVEMENT_OPTIONS) {
        expect(option).toHaveProperty("type");
        expect(option).toHaveProperty("label");
        expect(option).toHaveProperty("description");
        expect(option).toHaveProperty("estimatedCredits");
        expect(typeof option.type).toBe("string");
        expect(typeof option.label).toBe("string");
        expect(typeof option.description).toBe("string");
        expect(typeof option.estimatedCredits).toBe("number");
        expect(option.estimatedCredits).toBeGreaterThan(0);
      }
    });

    it("should have unique types", async () => {
      const types = IMPROVEMENT_OPTIONS.map((opt) => opt.type);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });
  });
});

/**
 * Tests for Image Generator Service
 *
 * Covers SIZE_MAP, generateImage, generateBatchImages,
 * generateBatchImagesWithStats, createImageRequestsFromPlacements,
 * and utility functions.
 * Focus on the size strategy (4.4), resilience behavior, and stats shape (Issue #23).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ImageRequest, ImagePlacement, VisualStyle } from "../../../types/premium.js";

// ============================================
// Mocks
// ============================================

const mockImagesGenerate = vi.fn();

vi.mock("openai", () => {
  class MockAPIError extends Error {
    code: string;
    status: number;
    constructor(status: number, body: any, message: string, headers: any) {
      super(message);
      this.name = "APIError";
      this.status = status;
      this.code = body?.code || "";
    }
  }

  const MockOpenAI = vi.fn().mockImplementation(() => ({
    images: {
      generate: mockImagesGenerate,
    },
  }));

  // Attach APIError as a static property (OpenAI.APIError usage)
  (MockOpenAI as any).APIError = MockAPIError;

  return { default: MockOpenAI };
});

vi.mock("../../../services/premium/image-cache.js", () => ({
  getImageCache: vi.fn(() => ({
    get: vi.fn(() => null),
    set: vi.fn(),
    has: vi.fn(() => false),
    getStats: vi.fn(() => ({ hits: 0, misses: 0, size: 0, entries: 0 })),
    getHitRate: vi.fn(() => 0),
  })),
  createCacheKey: vi.fn(() => "mock-cache-key"),
  createCacheMetadata: vi.fn(() => ({})),
}));

// Import after mocks
import {
  SIZE_MAP,
  generateImage,
  generateBatchImages,
  generateBatchImagesWithStats,
  createImageRequestsFromPlacements,
  estimateImageCredits,
  isImageGenerationAvailable,
  resetImageClient,
} from "../../../services/premium/image-generator.js";
import { getImageCache } from "../../../services/premium/image-cache.js";

// ============================================
// Helpers
// ============================================

function createMockRequest(overrides?: Partial<ImageRequest>): ImageRequest {
  return {
    prompt: "counting apples",
    style: "friendly_cartoon",
    size: "medium",
    ...overrides,
  };
}

function mockSuccessfulGeneration(base64Data = "mockBase64ImageData") {
  mockImagesGenerate.mockResolvedValue({
    data: [{ b64_json: base64Data }],
  });
}

// ============================================
// Tests
// ============================================

describe("Image Generator Service", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-api-key";
    vi.clearAllMocks();
    resetImageClient();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  // ===== SIZE_MAP Tests =====

  describe("SIZE_MAP", () => {
    it("should define small as 1024x1024 OpenAI with 256x256 target", () => {
      expect(SIZE_MAP.small.openai).toBe("1024x1024");
      expect(SIZE_MAP.small.target).toEqual({ width: 256, height: 256 });
    });

    it("should define medium as 1024x1024 OpenAI with 400x300 target", () => {
      expect(SIZE_MAP.medium.openai).toBe("1024x1024");
      expect(SIZE_MAP.medium.target).toEqual({ width: 400, height: 300 });
    });

    it("should define wide as 1792x1024 OpenAI with 600x300 target", () => {
      expect(SIZE_MAP.wide.openai).toBe("1792x1024");
      expect(SIZE_MAP.wide.target).toEqual({ width: 600, height: 300 });
    });

    it("should define large as legacy alias matching medium target", () => {
      expect(SIZE_MAP.large.openai).toBe(SIZE_MAP.medium.openai);
      expect(SIZE_MAP.large.target).toEqual(SIZE_MAP.medium.target);
    });

    it("should use landscape ratio for wide images", () => {
      expect(SIZE_MAP.wide.target.width).toBeGreaterThan(SIZE_MAP.wide.target.height);
    });

    it("should use square ratio for small images", () => {
      expect(SIZE_MAP.small.target.width).toBe(SIZE_MAP.small.target.height);
    });
  });

  // ===== generateImage Tests =====

  describe("generateImage", () => {
    it("should call OpenAI with correct size for small request", async () => {
      mockSuccessfulGeneration();
      const request = createMockRequest({ size: "small" });

      await generateImage(request, undefined, { maxRetries: 0 });

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          size: "1024x1024",
        })
      );
    });

    it("should call OpenAI with correct size for medium request", async () => {
      mockSuccessfulGeneration();
      const request = createMockRequest({ size: "medium" });

      await generateImage(request, undefined, { maxRetries: 0 });

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          size: "1024x1024",
        })
      );
    });

    it("should call OpenAI with correct size for wide request", async () => {
      mockSuccessfulGeneration();
      const request = createMockRequest({ size: "wide" });

      await generateImage(request, undefined, { maxRetries: 0 });

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          size: "1792x1024",
        })
      );
    });

    it("should fall back to medium size for unknown size value", async () => {
      mockSuccessfulGeneration();
      const request = createMockRequest({ size: "unknown" as any });

      await generateImage(request, undefined, { maxRetries: 0 });

      // Should use medium's OpenAI size (fallback via SIZE_MAP[request.size] || SIZE_MAP.medium)
      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          size: "1024x1024",
        })
      );
    });

    it("should return ImageResult with correct dimensions from OpenAI size", async () => {
      mockSuccessfulGeneration();
      const request = createMockRequest({ size: "wide" });

      const result = await generateImage(request, undefined, { maxRetries: 0 });

      // wide uses 1792x1024, so dimensions should be parsed from that
      expect(result.width).toBe(1792);
      expect(result.height).toBe(1024);
    });

    it("should include placementId in result", async () => {
      mockSuccessfulGeneration();
      const request = createMockRequest({ placementId: "q3" });

      const result = await generateImage(request, undefined, { maxRetries: 0 });

      expect(result.placementId).toBe("q3");
    });

    it("should call OpenAI with dall-e-3 model", async () => {
      mockSuccessfulGeneration();
      const request = createMockRequest();

      await generateImage(request, undefined, { maxRetries: 0 });

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "dall-e-3",
          response_format: "b64_json",
          quality: "standard",
        })
      );
    });

    it("should use vivid style for friendly_cartoon", async () => {
      mockSuccessfulGeneration();
      const request = createMockRequest({ style: "friendly_cartoon" });

      await generateImage(request, undefined, { maxRetries: 0 });

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          style: "vivid",
        })
      );
    });

    it("should use natural style for non-cartoon styles", async () => {
      mockSuccessfulGeneration();
      const request = createMockRequest({ style: "black_white" });

      await generateImage(request, undefined, { maxRetries: 0 });

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          style: "natural",
        })
      );
    });

    it("should return placeholder on content_policy_violation", async () => {
      // Import OpenAI to access the mock APIError
      const OpenAI = (await import("openai")).default as any;
      const apiError = new OpenAI.APIError(
        400,
        { code: "content_policy_violation" },
        "content policy violation",
        {}
      );
      mockImagesGenerate.mockRejectedValue(apiError);

      const request = createMockRequest();
      const result = await generateImage(request, undefined, { maxRetries: 0 });

      expect(result.base64Data).toMatch(/^placeholder:/);
    });

    it("should retry on transient failure and succeed", async () => {
      // First call fails, second succeeds
      mockImagesGenerate
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValueOnce({
          data: [{ b64_json: "retrySuccess" }],
        });

      const request = createMockRequest();
      const result = await generateImage(request, undefined, {
        maxRetries: 1,
        retryDelay: 10, // Fast for test
        timeout: 5000,
      });

      expect(result.base64Data).toBe("retrySuccess");
      expect(mockImagesGenerate).toHaveBeenCalledTimes(2);
    });

    it("should fall back to simple_icons style after all retries fail", async () => {
      // All primary attempts fail, but simple_icons succeeds
      mockImagesGenerate
        .mockRejectedValueOnce(new Error("fail 1"))
        .mockRejectedValueOnce(new Error("fail 2"))
        .mockResolvedValueOnce({
          data: [{ b64_json: "fallbackSuccess" }],
        });

      const request = createMockRequest({ style: "friendly_cartoon" });
      const result = await generateImage(request, undefined, {
        maxRetries: 1,
        retryDelay: 10,
        timeout: 5000,
      });

      expect(result.base64Data).toBe("fallbackSuccess");
      // Third call should have been made (the simple_icons fallback)
      expect(mockImagesGenerate).toHaveBeenCalledTimes(3);
    });

    it("should return placeholder after all attempts fail", async () => {
      mockImagesGenerate.mockRejectedValue(new Error("always fails"));

      const request = createMockRequest({ style: "simple_icons" });
      const result = await generateImage(request, undefined, {
        maxRetries: 0,
        retryDelay: 10,
        timeout: 5000,
      });

      // simple_icons won't try fallback (already is the fallback style)
      expect(result.base64Data).toMatch(/^placeholder:/);
    });
  });

  // ===== createImageRequestsFromPlacements Tests =====

  describe("createImageRequestsFromPlacements", () => {
    it("should convert placements to image requests preserving size", () => {
      const placements: ImagePlacement[] = [
        { afterItemId: "q1", description: "apples", purpose: "counting_support", size: "small" },
        { afterItemId: "q2", description: "diagram", purpose: "diagram", size: "medium" },
        { afterItemId: "q3", description: "banner", purpose: "diagram", size: "wide" },
      ];

      const requests = createImageRequestsFromPlacements(placements, "friendly_cartoon");

      expect(requests).toHaveLength(3);
      expect(requests[0].size).toBe("small");
      expect(requests[1].size).toBe("medium");
      expect(requests[2].size).toBe("wide");
    });

    it("should set placementId from afterItemId", () => {
      const placements: ImagePlacement[] = [
        { afterItemId: "q5", description: "test", purpose: "diagram", size: "medium" },
      ];

      const requests = createImageRequestsFromPlacements(placements, "black_white");

      expect(requests[0].placementId).toBe("q5");
    });

    it("should apply provided style to all requests", () => {
      const placements: ImagePlacement[] = [
        { afterItemId: "q1", description: "a", purpose: "diagram", size: "small" },
        { afterItemId: "q2", description: "b", purpose: "diagram", size: "wide" },
      ];

      const requests = createImageRequestsFromPlacements(placements, "black_white");

      expect(requests[0].style).toBe("black_white");
      expect(requests[1].style).toBe("black_white");
    });

    it("should use placement description as prompt", () => {
      const placements: ImagePlacement[] = [
        { afterItemId: "q1", description: "five red apples", purpose: "counting_support", size: "medium" },
      ];

      const requests = createImageRequestsFromPlacements(placements, "friendly_cartoon");

      expect(requests[0].prompt).toBe("five red apples");
    });
  });

  // ===== generateBatchImages Tests =====

  describe("generateBatchImages", () => {
    it("should return empty array for empty requests", async () => {
      const results = await generateBatchImages([]);

      expect(results).toEqual([]);
    });

    it("should generate images sequentially and return in order", async () => {
      mockImagesGenerate
        .mockResolvedValueOnce({ data: [{ b64_json: "image1" }] })
        .mockResolvedValueOnce({ data: [{ b64_json: "image2" }] });

      const requests = [
        createMockRequest({ prompt: "first", placementId: "q1" }),
        createMockRequest({ prompt: "second", placementId: "q2" }),
      ];

      const results = await generateBatchImages(requests, undefined, {
        maxRetries: 0,
        retryDelay: 10,
      });

      expect(results).toHaveLength(2);
      expect(results[0].base64Data).toBe("image1");
      expect(results[1].base64Data).toBe("image2");
    });

    it("should handle mixed sizes in a batch", async () => {
      mockImagesGenerate
        .mockResolvedValueOnce({ data: [{ b64_json: "smallImg" }] })
        .mockResolvedValueOnce({ data: [{ b64_json: "wideImg" }] });

      const requests = [
        createMockRequest({ size: "small" }),
        createMockRequest({ size: "wide" }),
      ];

      const results = await generateBatchImages(requests, undefined, {
        maxRetries: 0,
        retryDelay: 10,
      });

      expect(results).toHaveLength(2);
      // Verify OpenAI was called with different sizes
      expect(mockImagesGenerate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ size: "1024x1024" })
      );
      expect(mockImagesGenerate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ size: "1792x1024" })
      );
    });

    it("should call progress callback", async () => {
      mockSuccessfulGeneration();

      const requests = [createMockRequest(), createMockRequest()];
      const onProgress = vi.fn();

      await generateBatchImages(requests, undefined, { maxRetries: 0, retryDelay: 10 }, onProgress);

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
    });
  });

  // ===== generateBatchImagesWithStats Tests (Issue #23) =====

  describe("generateBatchImagesWithStats", () => {
    it("should return result with correct stats shape", async () => {
      mockSuccessfulGeneration();
      const requests = [createMockRequest()];

      const result = await generateBatchImagesWithStats(requests, undefined, {
        maxRetries: 0,
        retryDelay: 10,
      });

      expect(result).toHaveProperty("images");
      expect(result).toHaveProperty("stats");
      expect(result.stats).toEqual({
        total: expect.any(Number),
        generated: expect.any(Number),
        cached: expect.any(Number),
        failed: expect.any(Number),
      });
    });

    it("should count all images as generated when none fail and no cache hits", async () => {
      mockSuccessfulGeneration();
      const requests = [createMockRequest(), createMockRequest()];

      const result = await generateBatchImagesWithStats(requests, undefined, {
        maxRetries: 0,
        retryDelay: 10,
      });

      expect(result.stats).toEqual({
        total: 2,
        generated: 2,
        cached: 0,
        failed: 0,
      });
      expect(result.images).toHaveLength(2);
    });

    it("should count failed images based on placeholder prefix", async () => {
      // First image succeeds, second fails (returns placeholder after all retries)
      mockImagesGenerate
        .mockResolvedValueOnce({ data: [{ b64_json: "successImage" }] })
        .mockRejectedValue(new Error("always fails"));

      const requests = [
        createMockRequest({ style: "simple_icons" }),
        createMockRequest({ style: "simple_icons" }),
      ];

      const result = await generateBatchImagesWithStats(requests, undefined, {
        maxRetries: 0,
        retryDelay: 10,
        timeout: 5000,
      });

      expect(result.stats.total).toBe(2);
      expect(result.stats.failed).toBe(1);
      expect(result.stats.generated).toBe(1);
      expect(result.stats.cached).toBe(0);
    });

    it("should count cached images from cache hit delta", async () => {
      // Track hits via closure: each image generation increments the hit counter,
      // simulating the cache recording hits during batch processing
      let hitCount = 0;
      const mockCacheObj = {
        get: vi.fn(() => null),
        set: vi.fn(),
        has: vi.fn(() => false),
        getStats: vi.fn(() => ({ hits: hitCount, misses: 0, size: 0, entries: 0 })),
        getHitRate: vi.fn(() => 0),
      };
      vi.mocked(getImageCache).mockReturnValue(mockCacheObj as any);

      // Each image generation bumps the hit counter (simulating cache recording)
      mockImagesGenerate.mockImplementation(async () => {
        hitCount++;
        return { data: [{ b64_json: "mockData" }] };
      });

      const requests = [createMockRequest(), createMockRequest()];

      const result = await generateBatchImagesWithStats(requests, undefined, {
        maxRetries: 0,
        retryDelay: 10,
      });

      expect(result.stats.total).toBe(2);
      expect(result.stats.cached).toBe(2);
      expect(result.stats.generated).toBe(0);
      expect(result.stats.failed).toBe(0);

      // Restore default cache mock so subsequent tests are not affected
      vi.mocked(getImageCache).mockImplementation(() => ({
        get: vi.fn(() => null),
        set: vi.fn(),
        has: vi.fn(() => false),
        getStats: vi.fn(() => ({ hits: 0, misses: 0, size: 0, entries: 0 })),
        getHitRate: vi.fn(() => 0),
      }) as any);
    });

    it("should return empty stats for empty requests", async () => {
      const result = await generateBatchImagesWithStats([]);

      expect(result.stats).toEqual({
        total: 0,
        generated: 0,
        cached: 0,
        failed: 0,
      });
      expect(result.images).toEqual([]);
    });

    it("should produce stats shape compatible with database image_stats column", async () => {
      mockSuccessfulGeneration();
      const requests = [createMockRequest()];

      const result = await generateBatchImagesWithStats(requests, undefined, {
        maxRetries: 0,
        retryDelay: 10,
      });

      // Simulate the merge done in generator.ts line 748:
      //   image_stats: { ...imageStats, relevance: relevanceStats }
      const mockRelevanceStats = {
        total: 5,
        accepted: 3,
        rejected: 2,
        cap: 5,
        byPurpose: { counting_support: 2, shape_diagram: 1 },
      };
      const mergedStats = { ...result.stats, relevance: mockRelevanceStats };

      // Verify merged shape matches the ImageStats interface
      expect(mergedStats).toEqual({
        total: expect.any(Number),
        generated: expect.any(Number),
        cached: expect.any(Number),
        failed: expect.any(Number),
        relevance: {
          total: expect.any(Number),
          accepted: expect.any(Number),
          rejected: expect.any(Number),
          cap: expect.any(Number),
          byPurpose: expect.objectContaining({
            counting_support: expect.any(Number),
          }),
        },
      });
    });
  });

  // ===== Utility Functions =====

  describe("estimateImageCredits", () => {
    it("should calculate 0.5 credits per image rounded up", () => {
      expect(estimateImageCredits(1)).toBe(1);
      expect(estimateImageCredits(2)).toBe(1);
      expect(estimateImageCredits(3)).toBe(2);
      expect(estimateImageCredits(4)).toBe(2);
      expect(estimateImageCredits(5)).toBe(3);
    });

    it("should return 0 for 0 images", () => {
      expect(estimateImageCredits(0)).toBe(0);
    });
  });

  describe("isImageGenerationAvailable", () => {
    it("should return true when OPENAI_API_KEY is set", () => {
      process.env.OPENAI_API_KEY = "test-key";
      expect(isImageGenerationAvailable()).toBe(true);
    });

    it("should return false when OPENAI_API_KEY is not set", () => {
      delete process.env.OPENAI_API_KEY;
      expect(isImageGenerationAvailable()).toBe(false);
    });
  });
});

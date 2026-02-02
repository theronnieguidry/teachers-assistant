/**
 * Tests for OpenAIImageProvider
 *
 * Verifies the OpenAI DALL-E image provider implementation of the
 * ImageProvider interface: size mapping, image generation, availability,
 * content policy error detection, and client lifecycle.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

  (MockOpenAI as any).APIError = MockAPIError;

  return { default: MockOpenAI };
});

// Import after mocks
import { OpenAIImageProvider } from "../../../services/premium/providers/openai-image-provider.js";

// ============================================
// Helpers
// ============================================

function mockSuccessfulGeneration(b64Data = "base64ImageData") {
  mockImagesGenerate.mockResolvedValue({
    data: [{ b64_json: b64Data }],
  });
}

// ============================================
// Tests
// ============================================

describe("OpenAIImageProvider", () => {
  let provider: OpenAIImageProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    provider = new OpenAIImageProvider();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe("constructor", () => {
    it("should default to dall-e-3 model", async () => {
      mockSuccessfulGeneration();
      await provider.generateImage("test prompt", "medium", "friendly_cartoon");

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ model: "dall-e-3" })
      );
    });

    it("should accept a custom model parameter", async () => {
      const customProvider = new OpenAIImageProvider("dall-e-2");
      mockSuccessfulGeneration();
      await customProvider.generateImage("test prompt", "medium", "friendly_cartoon");

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ model: "dall-e-2" })
      );
    });
  });

  describe("name", () => {
    it("should return 'openai'", () => {
      expect(provider.name).toBe("openai");
    });
  });

  describe("getSizeMapping", () => {
    it("should return correct mapping for 'small'", () => {
      const mapping = provider.getSizeMapping("small");
      expect(mapping).toEqual({
        nativeSize: "1024x1024",
        target: { width: 256, height: 256 },
      });
    });

    it("should return correct mapping for 'medium'", () => {
      const mapping = provider.getSizeMapping("medium");
      expect(mapping).toEqual({
        nativeSize: "1024x1024",
        target: { width: 400, height: 300 },
      });
    });

    it("should return correct mapping for 'wide'", () => {
      const mapping = provider.getSizeMapping("wide");
      expect(mapping).toEqual({
        nativeSize: "1792x1024",
        target: { width: 600, height: 300 },
      });
    });

    it("should return correct mapping for 'large' (legacy alias)", () => {
      const mapping = provider.getSizeMapping("large");
      expect(mapping).toEqual({
        nativeSize: "1024x1024",
        target: { width: 400, height: 300 },
      });
    });

    it("should fall back to medium for unknown sizes", () => {
      const mapping = provider.getSizeMapping("unknown");
      expect(mapping).toEqual({
        nativeSize: "1024x1024",
        target: { width: 400, height: 300 },
      });
    });
  });

  describe("generateImage", () => {
    it("should call OpenAI images.generate with correct parameters", async () => {
      mockSuccessfulGeneration();

      await provider.generateImage("test prompt", "medium", "friendly_cartoon");

      expect(mockImagesGenerate).toHaveBeenCalledWith({
        model: "dall-e-3",
        prompt: "test prompt",
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
        quality: "standard",
        style: "vivid",
      });
    });

    it("should pass correct native size for 'wide'", async () => {
      mockSuccessfulGeneration();

      await provider.generateImage("test prompt", "wide", "simple_icons");

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ size: "1792x1024" })
      );
    });

    it("should use 'vivid' style for friendly_cartoon", async () => {
      mockSuccessfulGeneration();

      await provider.generateImage("test prompt", "medium", "friendly_cartoon");

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ style: "vivid" })
      );
    });

    it("should use 'natural' style for simple_icons", async () => {
      mockSuccessfulGeneration();

      await provider.generateImage("test prompt", "medium", "simple_icons");

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ style: "natural" })
      );
    });

    it("should use 'natural' style for black_white", async () => {
      mockSuccessfulGeneration();

      await provider.generateImage("test prompt", "medium", "black_white");

      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ style: "natural" })
      );
    });

    it("should return ImageProviderResult with correct fields", async () => {
      mockSuccessfulGeneration("myBase64Data");

      const result = await provider.generateImage("test prompt", "medium", "friendly_cartoon");

      expect(result).toEqual({
        base64Data: "myBase64Data",
        mediaType: "image/png",
        width: 1024,
        height: 1024,
      });
    });

    it("should return correct dimensions for 'wide' size", async () => {
      mockSuccessfulGeneration("wideData");

      const result = await provider.generateImage("test prompt", "wide", "friendly_cartoon");

      expect(result.width).toBe(1792);
      expect(result.height).toBe(1024);
    });

    it("should throw when no image data in response", async () => {
      mockImagesGenerate.mockResolvedValue({ data: [{}] });

      await expect(
        provider.generateImage("test prompt", "medium", "friendly_cartoon")
      ).rejects.toThrow("No image data in response");
    });

    it("should throw when OPENAI_API_KEY is not set", async () => {
      delete process.env.OPENAI_API_KEY;
      const noKeyProvider = new OpenAIImageProvider();

      await expect(
        noKeyProvider.generateImage("test prompt", "medium", "friendly_cartoon")
      ).rejects.toThrow("OPENAI_API_KEY environment variable is required");
    });
  });

  describe("isAvailable", () => {
    it("should return true when OPENAI_API_KEY is set", () => {
      process.env.OPENAI_API_KEY = "test-key";
      expect(provider.isAvailable()).toBe(true);
    });

    it("should return false when OPENAI_API_KEY is not set", () => {
      delete process.env.OPENAI_API_KEY;
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe("isContentPolicyError", () => {
    it("should return true for OpenAI content_policy_violation error", async () => {
      const OpenAI = (await import("openai")).default as any;
      const apiError = new OpenAI.APIError(
        400,
        { code: "content_policy_violation" },
        "Content policy violation",
        {}
      );
      expect(provider.isContentPolicyError(apiError)).toBe(true);
    });

    it("should return false for generic Error", () => {
      expect(provider.isContentPolicyError(new Error("generic"))).toBe(false);
    });

    it("should return false for other OpenAI API errors", async () => {
      const OpenAI = (await import("openai")).default as any;
      const apiError = new OpenAI.APIError(
        429,
        { code: "rate_limit_exceeded" },
        "Rate limited",
        {}
      );
      expect(provider.isContentPolicyError(apiError)).toBe(false);
    });

    it("should return false for non-Error values", () => {
      expect(provider.isContentPolicyError("string error")).toBe(false);
      expect(provider.isContentPolicyError(null)).toBe(false);
      expect(provider.isContentPolicyError(undefined)).toBe(false);
      expect(provider.isContentPolicyError(42)).toBe(false);
    });
  });

  describe("resetClient", () => {
    it("should allow re-initialization of the OpenAI client", async () => {
      mockSuccessfulGeneration();

      // First call initializes the client
      await provider.generateImage("test prompt", "medium", "friendly_cartoon");

      // Reset client
      provider.resetClient();

      // Second call should re-initialize
      await provider.generateImage("test prompt", "medium", "friendly_cartoon");

      // OpenAI constructor should have been called twice
      const OpenAI = (await import("openai")).default;
      expect(OpenAI).toHaveBeenCalledTimes(2);
    });
  });
});

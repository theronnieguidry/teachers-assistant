/**
 * Tests for Image Provider Resolution
 *
 * Verifies that the image-generator module correctly resolves providers
 * based on the IMAGE_PROVIDER and IMAGE_MODEL environment variables.
 * Tests exercise the resolution logic through the public API (isImageGenerationAvailable,
 * resetImageClient) since getImageProvider is an internal function.
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
  generateImage,
  isImageGenerationAvailable,
  resetImageClient,
} from "../../../services/premium/image-generator.js";

// ============================================
// Tests
// ============================================

describe("Image provider resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetImageClient();
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.IMAGE_PROVIDER;
    delete process.env.IMAGE_MODEL;
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.IMAGE_PROVIDER;
    delete process.env.IMAGE_MODEL;
    resetImageClient();
  });

  it("should default to OpenAI when IMAGE_PROVIDER is not set", () => {
    expect(isImageGenerationAvailable()).toBe(true);
  });

  it("should use OpenAI when IMAGE_PROVIDER=openai", () => {
    process.env.IMAGE_PROVIDER = "openai";
    expect(isImageGenerationAvailable()).toBe(true);
  });

  it("should return false from isImageGenerationAvailable for unsupported IMAGE_PROVIDER values", () => {
    process.env.IMAGE_PROVIDER = "nonexistent";
    expect(isImageGenerationAvailable()).toBe(false);
  });

  it("should pass IMAGE_MODEL to the provider", async () => {
    process.env.IMAGE_MODEL = "dall-e-2";
    mockImagesGenerate.mockResolvedValue({
      data: [{ b64_json: "base64data" }],
    });

    await generateImage(
      { prompt: "test", style: "friendly_cartoon", size: "medium" },
      { grade: "3", subject: "math" }
    );

    expect(mockImagesGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "dall-e-2" })
    );
  });

  it("should use default model when IMAGE_MODEL is not set", async () => {
    mockImagesGenerate.mockResolvedValue({
      data: [{ b64_json: "base64data" }],
    });

    await generateImage(
      { prompt: "test", style: "friendly_cartoon", size: "medium" },
      { grade: "3", subject: "math" }
    );

    expect(mockImagesGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "dall-e-3" })
    );
  });

  it("should cache the provider instance (singleton)", async () => {
    mockImagesGenerate.mockResolvedValue({
      data: [{ b64_json: "base64data" }],
    });

    // Two calls should reuse the same provider (same OpenAI client)
    await generateImage(
      { prompt: "test1", style: "friendly_cartoon", size: "medium" },
      { grade: "3", subject: "math" }
    );
    await generateImage(
      { prompt: "test2", style: "friendly_cartoon", size: "medium" },
      { grade: "3", subject: "math" }
    );

    // OpenAI constructor should only be called once
    const OpenAI = (await import("openai")).default;
    expect(OpenAI).toHaveBeenCalledTimes(1);
  });

  it("should reset provider on resetImageClient()", async () => {
    mockImagesGenerate.mockResolvedValue({
      data: [{ b64_json: "base64data" }],
    });

    await generateImage(
      { prompt: "test1", style: "friendly_cartoon", size: "medium" },
      { grade: "3", subject: "math" }
    );

    resetImageClient();

    await generateImage(
      { prompt: "test2", style: "friendly_cartoon", size: "medium" },
      { grade: "3", subject: "math" }
    );

    // OpenAI constructor should be called twice (once before reset, once after)
    const OpenAI = (await import("openai")).default;
    expect(OpenAI).toHaveBeenCalledTimes(2);
  });
});

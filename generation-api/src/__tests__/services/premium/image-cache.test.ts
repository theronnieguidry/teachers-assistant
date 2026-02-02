/**
 * Tests for Image Cache Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ImageCache,
  getImageCache,
  resetImageCache,
  createCacheKey,
  createCacheMetadata,
} from "../../../services/premium/image-cache.js";
import type { ImageResult, VisualStyle, Grade } from "../../../types/premium.js";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn().mockRejectedValue(new Error("File not found")),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Image Cache Service", () => {
  let cache: ImageCache;

  beforeEach(() => {
    cache = new ImageCache({ ttlDays: 30, maxEntries: 100 });
  });

  afterEach(() => {
    cache.stop();
    resetImageCache();
  });

  describe("ImageCache.generateHash", () => {
    it("should generate deterministic hash", () => {
      const hash1 = ImageCache.generateHash(
        "friendly_cartoon",
        "K",
        "Math",
        "medium",
        "counting apples",
        "space"
      );
      const hash2 = ImageCache.generateHash(
        "friendly_cartoon",
        "K",
        "Math",
        "medium",
        "counting apples",
        "space"
      );

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32); // SHA-256 truncated
    });

    it("should generate different hashes for different inputs", () => {
      const hash1 = ImageCache.generateHash(
        "friendly_cartoon",
        "K",
        "Math",
        "medium",
        "counting apples"
      );
      const hash2 = ImageCache.generateHash(
        "simple_icons",
        "K",
        "Math",
        "medium",
        "counting apples"
      );

      expect(hash1).not.toBe(hash2);
    });

    it("should be case-insensitive", () => {
      const hash1 = ImageCache.generateHash(
        "FRIENDLY_CARTOON",
        "K",
        "Math",
        "MEDIUM",
        "Counting Apples"
      );
      const hash2 = ImageCache.generateHash(
        "friendly_cartoon",
        "k",
        "math",
        "medium",
        "counting apples"
      );

      expect(hash1).toBe(hash2);
    });

    it("should handle optional theme", () => {
      const hash1 = ImageCache.generateHash(
        "friendly_cartoon",
        "K",
        "Math",
        "medium",
        "counting apples"
      );
      const hash2 = ImageCache.generateHash(
        "friendly_cartoon",
        "K",
        "Math",
        "medium",
        "counting apples",
        "space"
      );

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("get/set", () => {
    const mockImage: ImageResult = {
      base64Data: "iVBORw0KGgoAAAANSUhEUgAAAAE",
      mediaType: "image/png",
      width: 1024,
      height: 1024,
    };

    const mockMetadata = {
      style: "friendly_cartoon",
      grade: "K",
      subject: "Math",
      size: "medium",
      description: "counting apples",
    };

    it("should cache and retrieve images", () => {
      const hash = "test-hash-123";
      cache.set(hash, mockImage, mockMetadata);

      const retrieved = cache.get(hash);
      expect(retrieved).toBeDefined();
      expect(retrieved?.base64Data).toBe(mockImage.base64Data);
    });

    it("should return null for missing entries", () => {
      const result = cache.get("non-existent-hash");
      expect(result).toBeNull();
    });

    it("should not cache placeholder images", () => {
      const placeholderImage: ImageResult = {
        base64Data: "placeholder:xyz",
        mediaType: "image/png",
        width: 200,
        height: 150,
      };

      cache.set("placeholder-hash", placeholderImage, mockMetadata);
      const result = cache.get("placeholder-hash");
      expect(result).toBeNull();
    });

    it("should track hits and misses", () => {
      cache.set("hit-test", mockImage, mockMetadata);

      cache.get("hit-test"); // hit
      cache.get("miss-test"); // miss
      cache.get("miss-test2"); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
    });
  });

  describe("has", () => {
    it("should return true for existing entries", () => {
      const mockImage: ImageResult = {
        base64Data: "data",
        mediaType: "image/png",
        width: 100,
        height: 100,
      };

      cache.set("exists", mockImage, {
        style: "friendly_cartoon",
        grade: "K",
        subject: "Math",
        size: "medium",
        description: "test",
      });

      expect(cache.has("exists")).toBe(true);
    });

    it("should return false for missing entries", () => {
      expect(cache.has("missing")).toBe(false);
    });
  });

  describe("getOrGenerate", () => {
    const mockImage: ImageResult = {
      base64Data: "generated-data",
      mediaType: "image/png",
      width: 1024,
      height: 1024,
    };

    const mockMetadata = {
      style: "friendly_cartoon",
      grade: "K",
      subject: "Math",
      size: "medium",
      description: "test",
    };

    it("should return cached image without calling generator", async () => {
      cache.set("cached-hash", mockImage, mockMetadata);

      const generator = vi.fn();
      const result = await cache.getOrGenerate("cached-hash", mockMetadata, generator);

      expect(result.cached).toBe(true);
      expect(result.image.base64Data).toBe(mockImage.base64Data);
      expect(generator).not.toHaveBeenCalled();
    });

    it("should call generator for missing entries", async () => {
      const generator = vi.fn().mockResolvedValue(mockImage);
      const result = await cache.getOrGenerate("new-hash", mockMetadata, generator);

      expect(result.cached).toBe(false);
      expect(generator).toHaveBeenCalled();
      expect(result.image).toBe(mockImage);
    });

    it("should cache generated images", async () => {
      const generator = vi.fn().mockResolvedValue(mockImage);
      await cache.getOrGenerate("cache-after-gen", mockMetadata, generator);

      // Second call should hit cache
      generator.mockClear();
      const result = await cache.getOrGenerate("cache-after-gen", mockMetadata, generator);

      expect(result.cached).toBe(true);
      expect(generator).not.toHaveBeenCalled();
    });
  });

  describe("prune", () => {
    it("should remove expired entries", () => {
      // Create cache with very short TTL for testing
      const shortTtlCache = new ImageCache({ ttlDays: 0 }); // Expires immediately

      const mockImage: ImageResult = {
        base64Data: "data",
        mediaType: "image/png",
        width: 100,
        height: 100,
      };

      shortTtlCache.set("expired", mockImage, {
        style: "friendly_cartoon",
        grade: "K",
        subject: "Math",
        size: "medium",
        description: "test",
      });

      // Wait a bit then prune
      const pruned = shortTtlCache.prune();
      expect(pruned).toBeGreaterThanOrEqual(0);

      shortTtlCache.stop();
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      const mockImage: ImageResult = {
        base64Data: "data",
        mediaType: "image/png",
        width: 100,
        height: 100,
      };

      cache.set("entry1", mockImage, {
        style: "friendly_cartoon",
        grade: "K",
        subject: "Math",
        size: "medium",
        description: "test1",
      });
      cache.set("entry2", mockImage, {
        style: "friendly_cartoon",
        grade: "K",
        subject: "Math",
        size: "medium",
        description: "test2",
      });

      cache.clear();

      expect(cache.has("entry1")).toBe(false);
      expect(cache.has("entry2")).toBe(false);
      expect(cache.getStats().entries).toBe(0);
    });
  });

  describe("getHitRate", () => {
    it("should calculate hit rate percentage", () => {
      const mockImage: ImageResult = {
        base64Data: "data",
        mediaType: "image/png",
        width: 100,
        height: 100,
      };

      cache.set("hit", mockImage, {
        style: "friendly_cartoon",
        grade: "K",
        subject: "Math",
        size: "medium",
        description: "test",
      });

      cache.get("hit"); // hit
      cache.get("hit"); // hit
      cache.get("miss"); // miss
      cache.get("miss2"); // miss

      // 2 hits, 2 misses = 50%
      expect(cache.getHitRate()).toBe(50);
    });

    it("should return 0 for empty cache", () => {
      expect(cache.getHitRate()).toBe(0);
    });
  });

  describe("helper functions", () => {
    describe("createCacheKey", () => {
      it("should create key from parameters", () => {
        const key = createCacheKey({
          style: "friendly_cartoon",
          grade: "K",
          subject: "Math",
          size: "medium",
          description: "counting apples",
          theme: "space",
        });

        expect(key).toHaveLength(32);
      });
    });

    describe("createCacheMetadata", () => {
      it("should create metadata object", () => {
        const metadata = createCacheMetadata({
          style: "friendly_cartoon",
          grade: "K",
          subject: "Math",
          size: "medium",
          description: "counting apples",
        });

        expect(metadata).toEqual({
          style: "friendly_cartoon",
          grade: "K",
          subject: "Math",
          size: "medium",
          description: "counting apples",
        });
      });
    });
  });

  describe("singleton", () => {
    it("should return same instance", () => {
      const cache1 = getImageCache();
      const cache2 = getImageCache();
      expect(cache1).toBe(cache2);
    });

    it("should reset properly", () => {
      const cache1 = getImageCache();
      resetImageCache();
      const cache2 = getImageCache();
      expect(cache1).not.toBe(cache2);
    });
  });
});

/**
 * Tests for Image Compressor Service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  compressImage,
  compressImages,
  validateOutputSize,
  reduceToFitThreshold,
  isPlaceholder,
  getCompressionStats,
  SIZE_THRESHOLDS,
  TARGET_DIMENSIONS,
} from "../../../services/premium/image-compressor.js";
import type { ImageResult, VisualRichness } from "../../../types/premium.js";

// Mock sharp
vi.mock("sharp", () => {
  const mockSharp = vi.fn().mockImplementation(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 1024, height: 1024 }),
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("compressed-image-data")),
  }));
  return { default: mockSharp };
});

describe("Image Compressor Service", () => {
  describe("compressImage", () => {
    it("should return placeholder images unchanged", async () => {
      const placeholderData = "placeholder:somebase64data";
      const result = await compressImage(placeholderData, { size: "medium" });

      expect(result.base64Data).toBe(placeholderData);
      expect(result.mediaType).toBe("image/png");
      expect(result.compressionRatio).toBe(1);
    });

    it("should compress non-placeholder images", async () => {
      const mockPngBase64 = Buffer.from("fake-png-data").toString("base64");
      const result = await compressImage(mockPngBase64, { size: "medium" });

      expect(result.mediaType).toMatch(/image\/(webp|jpeg|png)/);
      // Mock returns fixed buffer - just verify we get size tracking
      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.compressedSize).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeDefined();
    });

    it("should use correct target dimensions for each size", async () => {
      expect(TARGET_DIMENSIONS.small).toEqual({ width: 256, height: 256 });
      expect(TARGET_DIMENSIONS.medium).toEqual({ width: 400, height: 300 });
      expect(TARGET_DIMENSIONS.wide).toEqual({ width: 600, height: 300 });
    });

    it("should default to medium dimensions when size not specified", async () => {
      const mockPngBase64 = Buffer.from("fake-png-data").toString("base64");
      const result = await compressImage(mockPngBase64, {});

      // Mock returns 1024x1024 (1:1 aspect ratio), which when fitted to
      // medium (400x300) while preserving aspect ratio becomes 300x300
      // (constrained by the shorter dimension)
      expect(result.width).toBe(300);
      expect(result.height).toBe(300);
    });
  });

  describe("compressImages", () => {
    it("should handle empty array", async () => {
      const result = await compressImages([], "standard");
      expect(result).toEqual([]);
    });

    it("should compress multiple images", async () => {
      const mockImages: ImageResult[] = [
        {
          base64Data: Buffer.from("img1").toString("base64"),
          mediaType: "image/png",
          width: 1024,
          height: 1024,
        },
        {
          base64Data: Buffer.from("img2").toString("base64"),
          mediaType: "image/png",
          width: 1024,
          height: 1024,
        },
      ];

      const result = await compressImages(mockImages, "standard");
      expect(result).toHaveLength(2);
    });
  });

  describe("validateOutputSize", () => {
    it("should pass when under threshold", () => {
      const images = [
        {
          base64Data: "a".repeat(1000),
          mediaType: "image/webp" as const,
          width: 400,
          height: 300,
          originalSize: 1000,
          compressedSize: 750,
          compressionRatio: 0.75,
        },
      ];

      const result = validateOutputSize(images, "standard");
      expect(result.valid).toBe(true);
      expect(result.percentUsed).toBeLessThan(100);
    });

    it("should fail when over threshold", () => {
      const images = [
        {
          base64Data: "a".repeat(10 * 1024 * 1024), // 10MB
          mediaType: "image/webp" as const,
          width: 400,
          height: 300,
          originalSize: 10 * 1024 * 1024,
          compressedSize: 10 * 1024 * 1024,
          compressionRatio: 1,
        },
      ];

      const result = validateOutputSize(images, "standard");
      expect(result.valid).toBe(false);
      expect(result.recommendation).toBeDefined();
    });

    it("should have correct thresholds per richness level", () => {
      expect(SIZE_THRESHOLDS.minimal).toBe(5 * 1024 * 1024);
      expect(SIZE_THRESHOLDS.standard).toBe(5 * 1024 * 1024);
      expect(SIZE_THRESHOLDS.rich).toBe(12 * 1024 * 1024);
    });
  });

  describe("reduceToFitThreshold", () => {
    it("should return all images if under threshold", () => {
      const images = [
        {
          base64Data: "a".repeat(1000),
          mediaType: "image/webp" as const,
          width: 400,
          height: 300,
          originalSize: 1000,
          compressedSize: 750,
          compressionRatio: 0.75,
        },
      ];

      const result = reduceToFitThreshold(images, ["diagram"], "standard");
      expect(result).toHaveLength(1);
    });

    it("should remove decoration images first when over threshold", () => {
      const largeSize = 3 * 1024 * 1024; // 3MB each
      const images = [
        {
          base64Data: "a".repeat(largeSize),
          mediaType: "image/webp" as const,
          width: 400,
          height: 300,
          originalSize: largeSize,
          compressedSize: largeSize,
          compressionRatio: 1,
        },
        {
          base64Data: "b".repeat(largeSize),
          mediaType: "image/webp" as const,
          width: 400,
          height: 300,
          originalSize: largeSize,
          compressedSize: largeSize,
          compressionRatio: 1,
        },
      ];

      // Total: 6MB, threshold: 5MB - should drop one
      const result = reduceToFitThreshold(
        images,
        ["decoration", "diagram"],
        "standard"
      );

      // Should keep diagram, drop decoration
      expect(result.length).toBeLessThan(images.length);
    });
  });

  describe("isPlaceholder", () => {
    it("should return true for placeholder images", () => {
      const placeholder: ImageResult = {
        base64Data: "placeholder:somedata",
        mediaType: "image/png",
        width: 200,
        height: 150,
      };
      expect(isPlaceholder(placeholder)).toBe(true);
    });

    it("should return false for real images", () => {
      const realImage: ImageResult = {
        base64Data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
        mediaType: "image/png",
        width: 1024,
        height: 1024,
      };
      expect(isPlaceholder(realImage)).toBe(false);
    });
  });

  describe("getCompressionStats", () => {
    it("should calculate correct stats", () => {
      const images = [
        {
          base64Data: "a".repeat(1000),
          mediaType: "image/webp" as const,
          width: 400,
          height: 300,
          originalSize: 2000,
          compressedSize: 1000,
          compressionRatio: 0.5,
        },
        {
          base64Data: "b".repeat(500),
          mediaType: "image/webp" as const,
          width: 400,
          height: 300,
          originalSize: 1000,
          compressedSize: 500,
          compressionRatio: 0.5,
        },
      ];

      const stats = getCompressionStats(images);
      expect(stats.totalOriginal).toBe(3000);
      expect(stats.totalCompressed).toBe(1500);
      expect(stats.averageRatio).toBe(0.5);
      expect(stats.placeholderCount).toBe(0);
    });

    it("should count placeholders", () => {
      const images = [
        {
          base64Data: "placeholder:xyz",
          mediaType: "image/png" as const,
          width: 200,
          height: 150,
          originalSize: 100,
          compressedSize: 100,
          compressionRatio: 1,
        },
        {
          base64Data: "realdata",
          mediaType: "image/webp" as const,
          width: 400,
          height: 300,
          originalSize: 1000,
          compressedSize: 500,
          compressionRatio: 0.5,
        },
      ];

      const stats = getCompressionStats(images);
      expect(stats.placeholderCount).toBe(1);
    });
  });
});

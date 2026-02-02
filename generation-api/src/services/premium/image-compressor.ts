/**
 * Image Compressor Service
 *
 * Compresses and optimizes images for premium worksheet generation.
 * Converts PNG to WebP/JPEG, resizes based on placement size, and
 * validates total output size against thresholds.
 */

import sharp from "sharp";
import type { ImageResult, VisualRichness } from "../../types/premium.js";

// ============================================
// Types
// ============================================

export interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  format: "webp" | "jpeg" | "png";
  quality: number; // 0-100
}

export interface CompressedImage extends ImageResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface SizeValidationResult {
  valid: boolean;
  totalBytes: number;
  maxAllowed: number;
  percentUsed: number;
  recommendation?: string;
}

// ============================================
// Constants
// ============================================

// Size thresholds per richness level (bytes)
export const SIZE_THRESHOLDS: Record<VisualRichness, number> = {
  minimal: 5 * 1024 * 1024, // 5MB
  standard: 5 * 1024 * 1024, // 5MB
  rich: 12 * 1024 * 1024, // 12MB
};

// Target dimensions per placement size
export const TARGET_DIMENSIONS: Record<
  string,
  { width: number; height: number }
> = {
  small: { width: 256, height: 256 },
  medium: { width: 400, height: 300 },
  wide: { width: 600, height: 300 },
  large: { width: 400, height: 300 }, // Legacy alias for medium
};

// Default compression settings
const DEFAULT_QUALITY = 85;
const DEFAULT_FORMAT: "webp" | "jpeg" = "webp";

// ============================================
// Main Functions
// ============================================

/**
 * Compress a single image from base64 PNG to optimized WebP/JPEG
 *
 * @param base64Png - Base64-encoded PNG image data
 * @param options - Compression options (dimensions, format, quality)
 * @returns Compressed image with size metadata
 */
export async function compressImage(
  base64Png: string,
  options: Partial<CompressionOptions> & { size?: string }
): Promise<CompressedImage> {
  // Handle placeholder images - return as-is
  if (base64Png.startsWith("placeholder:")) {
    const placeholderSize = Buffer.from(base64Png).length;
    return {
      base64Data: base64Png,
      mediaType: "image/png",
      width: 200,
      height: 150,
      originalSize: placeholderSize,
      compressedSize: placeholderSize,
      compressionRatio: 1,
    };
  }

  // Get target dimensions from size or options
  const sizeKey = options.size || "medium";
  const targetDims = TARGET_DIMENSIONS[sizeKey] || TARGET_DIMENSIONS.medium;
  const maxWidth = options.maxWidth || targetDims.width;
  const maxHeight = options.maxHeight || targetDims.height;
  const format = options.format || DEFAULT_FORMAT;
  const quality = options.quality || DEFAULT_QUALITY;

  // Decode base64 to buffer
  const inputBuffer = Buffer.from(base64Png, "base64");
  const originalSize = inputBuffer.length;

  try {
    // Create sharp instance and get metadata
    let pipeline = sharp(inputBuffer);
    const metadata = await pipeline.metadata();

    // Calculate dimensions while maintaining aspect ratio
    const { width: targetWidth, height: targetHeight } = calculateDimensions(
      metadata.width || maxWidth,
      metadata.height || maxHeight,
      maxWidth,
      maxHeight
    );

    // Rebuild pipeline with resize
    pipeline = sharp(inputBuffer).resize(targetWidth, targetHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });

    // Apply format-specific compression
    let outputBuffer: Buffer;
    let mediaType: "image/webp" | "image/jpeg" | "image/png";

    if (format === "webp") {
      outputBuffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();
      mediaType = "image/webp";
    } else if (format === "jpeg") {
      outputBuffer = await pipeline
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      mediaType = "image/jpeg";
    } else {
      outputBuffer = await pipeline
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer();
      mediaType = "image/png";
    }

    // If WebP is larger than original, try JPEG as fallback
    if (format === "webp" && outputBuffer.length >= originalSize) {
      const jpegBuffer = await sharp(inputBuffer)
        .resize(targetWidth, targetHeight, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

      if (jpegBuffer.length < outputBuffer.length) {
        outputBuffer = jpegBuffer;
        mediaType = "image/jpeg";
      }
    }

    const compressedSize = outputBuffer.length;
    const compressionRatio =
      originalSize > 0 ? compressedSize / originalSize : 1;

    console.log(
      `[image-compressor] Compressed ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${(compressionRatio * 100).toFixed(0)}%)`
    );

    return {
      base64Data: outputBuffer.toString("base64"),
      mediaType,
      width: targetWidth,
      height: targetHeight,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error) {
    console.error("[image-compressor] Compression failed:", error);

    // Return original on failure
    return {
      base64Data: base64Png,
      mediaType: "image/png",
      width: maxWidth,
      height: maxHeight,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
    };
  }
}

/**
 * Compress multiple images in batch
 *
 * @param images - Array of ImageResult objects
 * @param richness - Visual richness level (affects quality tradeoffs)
 * @returns Array of compressed images
 */
export async function compressImages(
  images: ImageResult[],
  richness: VisualRichness = "standard"
): Promise<CompressedImage[]> {
  if (images.length === 0) {
    return [];
  }

  console.log(
    `[image-compressor] Compressing ${images.length} images (richness: ${richness})`
  );

  // Adjust quality based on image count and richness
  const quality = calculateQuality(images.length, richness);

  const compressed = await Promise.all(
    images.map((img) =>
      compressImage(img.base64Data, {
        quality,
        size: inferSizeFromDimensions(img.width, img.height),
      })
    )
  );

  // Log total size
  const totalOriginal = compressed.reduce((sum, img) => sum + img.originalSize, 0);
  const totalCompressed = compressed.reduce(
    (sum, img) => sum + img.compressedSize,
    0
  );

  console.log(
    `[image-compressor] Batch complete: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB → ${(totalCompressed / 1024 / 1024).toFixed(2)}MB`
  );

  return compressed;
}

/**
 * Validate that total image size is within thresholds
 *
 * @param images - Array of compressed images
 * @param richness - Visual richness level (determines threshold)
 * @returns Validation result with size metrics
 */
export function validateOutputSize(
  images: CompressedImage[],
  richness: VisualRichness
): SizeValidationResult {
  const maxAllowed = SIZE_THRESHOLDS[richness];
  const totalBytes = images.reduce((sum, img) => sum + img.compressedSize, 0);
  const percentUsed = (totalBytes / maxAllowed) * 100;
  const valid = totalBytes <= maxAllowed;

  let recommendation: string | undefined;
  if (!valid) {
    const overBy = totalBytes - maxAllowed;
    const dropCount = Math.ceil(overBy / (totalBytes / images.length));
    recommendation = `Output exceeds limit by ${(overBy / 1024 / 1024).toFixed(2)}MB. Consider dropping ${dropCount} lowest-priority images or reducing quality.`;
  } else if (percentUsed > 80) {
    recommendation = `Output is at ${percentUsed.toFixed(0)}% of limit. Consider reducing image count for safety margin.`;
  }

  return {
    valid,
    totalBytes,
    maxAllowed,
    percentUsed,
    recommendation,
  };
}

/**
 * Reduce images to fit within size threshold
 * Drops lowest-priority images (decorative first) until within limit
 *
 * @param images - Array of compressed images with placement info
 * @param purposes - Array of purposes corresponding to each image
 * @param richness - Visual richness level
 * @returns Filtered array of images that fit within threshold
 */
export function reduceToFitThreshold(
  images: CompressedImage[],
  purposes: Array<string | undefined>,
  richness: VisualRichness
): CompressedImage[] {
  const maxAllowed = SIZE_THRESHOLDS[richness];
  let totalBytes = images.reduce((sum, img) => sum + img.compressedSize, 0);

  if (totalBytes <= maxAllowed) {
    return images;
  }

  // Priority order (lowest priority first for removal)
  const priorityOrder = ["decoration", "illustration", "diagram"];

  // Create indexed array for sorting
  const indexed = images.map((img, i) => ({
    img,
    purpose: purposes[i] || "decoration",
    index: i,
  }));

  // Sort by priority (lowest first)
  indexed.sort((a, b) => {
    const aPriority = priorityOrder.indexOf(a.purpose);
    const bPriority = priorityOrder.indexOf(b.purpose);
    return aPriority - bPriority;
  });

  // Remove images until within threshold
  const removed: number[] = [];
  for (const item of indexed) {
    if (totalBytes <= maxAllowed) break;
    totalBytes -= item.img.compressedSize;
    removed.push(item.index);
  }

  if (removed.length > 0) {
    console.log(
      `[image-compressor] Dropped ${removed.length} images to fit within ${(maxAllowed / 1024 / 1024).toFixed(0)}MB threshold`
    );
  }

  // Return images not removed, preserving original order
  return images.filter((_, i) => !removed.includes(i));
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate output dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = srcWidth / srcHeight;

  let width = maxWidth;
  let height = maxWidth / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Calculate compression quality based on image count and richness
 * More images = lower quality to stay within thresholds
 */
function calculateQuality(imageCount: number, richness: VisualRichness): number {
  const baseQuality = richness === "rich" ? 80 : 85;

  // Reduce quality as image count increases
  if (imageCount > 8) return Math.max(60, baseQuality - 15);
  if (imageCount > 5) return Math.max(70, baseQuality - 10);
  if (imageCount > 3) return Math.max(75, baseQuality - 5);

  return baseQuality;
}

/**
 * Infer size category from image dimensions
 */
function inferSizeFromDimensions(width: number, height: number): string {
  if (width <= 300 && height <= 300) return "small";
  if (width > height * 1.5) return "wide";
  return "medium";
}

/**
 * Check if an image is a placeholder
 */
export function isPlaceholder(image: ImageResult | CompressedImage): boolean {
  return image.base64Data.startsWith("placeholder:");
}

/**
 * Get compression statistics for a batch of images
 */
export function getCompressionStats(images: CompressedImage[]): {
  totalOriginal: number;
  totalCompressed: number;
  averageRatio: number;
  placeholderCount: number;
} {
  const nonPlaceholders = images.filter((img) => !isPlaceholder(img));

  const totalOriginal = nonPlaceholders.reduce(
    (sum, img) => sum + img.originalSize,
    0
  );
  const totalCompressed = nonPlaceholders.reduce(
    (sum, img) => sum + img.compressedSize,
    0
  );
  const averageRatio =
    totalOriginal > 0 ? totalCompressed / totalOriginal : 1;
  const placeholderCount = images.length - nonPlaceholders.length;

  return {
    totalOriginal,
    totalCompressed,
    averageRatio,
    placeholderCount,
  };
}

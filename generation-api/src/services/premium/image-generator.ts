/**
 * Image Generator Service
 *
 * Generates educational images via a pluggable ImageProvider abstraction.
 * Default provider: OpenAI DALL-E 3 (configurable via IMAGE_PROVIDER env var).
 *
 * Features:
 * - Provider abstraction: swap image backends without changing callers
 * - Resilience: timeouts, retries, graceful degradation
 * - Size strategy: small/medium/wide with target dimensions
 * - Cache integration: reduces redundant API calls
 */

import type {
  ImageProvider,
  ImageRequest,
  ImageResult,
  VisualStyle,
  ImagePlacement,
  Grade,
} from "../../types/premium.js";
import { OpenAIImageProvider } from "./providers/openai-image-provider.js";
import {
  getImageCache,
  createCacheKey,
  createCacheMetadata,
} from "./image-cache.js";

// ============================================
// Provider Resolution (config-driven)
// ============================================

let activeProvider: ImageProvider | null = null;

function getImageProvider(): ImageProvider {
  if (!activeProvider) {
    const providerName = process.env.IMAGE_PROVIDER || "openai";
    const model = process.env.IMAGE_MODEL;

    switch (providerName) {
      case "openai":
        activeProvider = new OpenAIImageProvider(model);
        break;
      default:
        throw new Error(`Unsupported image provider: ${providerName}`);
    }
  }
  return activeProvider;
}

// ============================================
// Resilience Configuration
// ============================================

export interface ResilienceOptions {
  timeout: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
}

const DEFAULT_RESILIENCE: ResilienceOptions = {
  timeout: 90000, // 90 seconds
  maxRetries: 1,
  retryDelay: 2000, // 2 seconds
};

// Style-specific prompt modifications
const STYLE_PROMPTS: Record<VisualStyle, string> = {
  friendly_cartoon:
    "friendly cartoon style, colorful, child-appropriate, simple shapes, happy expressions, educational illustration, no text",
  simple_icons:
    "simple flat icon style, minimal colors (2-3 colors max), clean lines, educational symbol, no text, vector-like",
  black_white:
    "black and white line art, coloring book style, clear outlines, no shading, suitable for printing, no text",
};

// Grade-appropriate guidelines
const GRADE_SAFETY: Record<string, string> = {
  K: "extremely simple and friendly, suitable for 5-6 year olds, no scary elements",
  "1": "very simple and friendly, suitable for 6-7 year olds",
  "2": "simple and friendly, suitable for 7-8 year olds",
  "3": "friendly and engaging, suitable for 8-9 year olds",
  "4": "appropriate for 9-10 year olds, educational focus",
  "5": "appropriate for 10-11 year olds, educational focus",
  "6": "appropriate for 11-12 year olds, educational focus",
};

// Map size to OpenAI dimensions and target output dimensions
export const SIZE_MAP: Record<
  string,
  {
    openai: "1024x1024" | "1792x1024" | "1024x1792";
    target: { width: number; height: number };
  }
> = {
  small: { openai: "1024x1024", target: { width: 256, height: 256 } },
  medium: { openai: "1024x1024", target: { width: 400, height: 300 } },
  wide: { openai: "1792x1024", target: { width: 600, height: 300 } },
  large: { openai: "1024x1024", target: { width: 400, height: 300 } }, // Legacy alias
};

/**
 * Build the full prompt for image generation
 */
function buildImagePrompt(
  description: string,
  style: VisualStyle,
  context?: { grade?: Grade; subject?: string; theme?: string }
): string {
  const parts: string[] = [];

  // Main description
  parts.push(`Educational illustration: ${description}`);

  // Style instructions
  parts.push(STYLE_PROMPTS[style]);

  // Grade safety
  if (context?.grade) {
    parts.push(GRADE_SAFETY[context.grade] || GRADE_SAFETY["3"]);
  }

  // Theme if provided
  if (context?.theme) {
    parts.push(`Theme: ${context.theme}`);
  }

  // Universal safety
  parts.push("safe for children, no scary or inappropriate content");
  parts.push("no brand logos, no copyrighted characters");
  parts.push("high contrast, suitable for printing");

  return parts.join(". ");
}

/**
 * Generate a single image using the active provider (internal, no resilience)
 */
async function generateImageInternal(
  request: ImageRequest,
  context?: { grade?: Grade; subject?: string; theme?: string }
): Promise<ImageResult> {
  const provider = getImageProvider();

  const prompt = buildImagePrompt(request.prompt, request.style, context);
  const sizeMapping = provider.getSizeMapping(request.size);

  console.log(`[image-generator] Generating image: "${request.prompt}" (${request.style}, ${sizeMapping.nativeSize})`);

  const result = await provider.generateImage(prompt, request.size, request.style);

  console.log("[image-generator] Image generated successfully");

  return {
    base64Data: result.base64Data,
    mediaType: result.mediaType,
    width: result.width,
    height: result.height,
    placementId: request.placementId,
  };
}

/**
 * Generate a single image with resilience (timeout, retry, fallback)
 */
export async function generateImage(
  request: ImageRequest,
  context?: { grade?: Grade; subject?: string; theme?: string },
  options: Partial<ResilienceOptions> = {}
): Promise<ImageResult> {
  const opts = { ...DEFAULT_RESILIENCE, ...options };

  // Check cache first
  const cache = getImageCache();
  const cacheKey = createCacheKey({
    style: request.style,
    grade: context?.grade || "3",
    subject: context?.subject || "general",
    size: request.size,
    description: request.prompt,
    theme: context?.theme,
  });

  const cachedImage = cache.get(cacheKey);
  if (cachedImage) {
    return { ...cachedImage, placementId: request.placementId };
  }

  // Try to generate with resilience
  let lastError: Error | null = null;
  let attempts = 0;

  while (attempts <= opts.maxRetries) {
    attempts++;

    try {
      const result = await withTimeout(
        generateImageInternal(request, context),
        opts.timeout
      );

      // Cache successful result
      cache.set(cacheKey, result, createCacheMetadata({
        style: request.style,
        grade: context?.grade || "3",
        subject: context?.subject || "general",
        size: request.size,
        description: request.prompt,
      }));

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Content policy violation - return placeholder immediately
      const provider = getImageProvider();
      if (provider.isContentPolicyError(error)) {
        console.warn("[image-generator] Content policy violation - using placeholder");
        return createPlaceholderImage(request.prompt, request.placementId);
      }

      // Log retry attempt
      if (attempts <= opts.maxRetries) {
        console.warn(`[image-generator] Attempt ${attempts} failed, retrying in ${opts.retryDelay}ms...`);
        await sleep(opts.retryDelay);
      }
    }
  }

  // Fallback: try with simpler style
  if (request.style !== "simple_icons") {
    console.warn("[image-generator] Retrying with simple_icons style...");
    try {
      const fallbackRequest = { ...request, style: "simple_icons" as VisualStyle };
      const result = await withTimeout(
        generateImageInternal(fallbackRequest, context),
        opts.timeout
      );
      return result;
    } catch (fallbackError) {
      console.error("[image-generator] Fallback also failed");
    }
  }

  // Final fallback: placeholder
  console.error(`[image-generator] All attempts failed: ${lastError?.message}`);
  return createPlaceholderImage(request.prompt, request.placementId);
}

/**
 * Wrap a promise with a timeout
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

export interface BatchGenerationResult {
  images: ImageResult[];
  stats: {
    total: number;
    generated: number;
    cached: number;
    failed: number;
  };
}

/**
 * Generate multiple images in batch with resilience
 * Returns results in the same order as requests, with placeholders for failures
 */
export async function generateBatchImages(
  requests: ImageRequest[],
  context?: { grade?: Grade; subject?: string; theme?: string },
  options?: Partial<ResilienceOptions>,
  onProgress?: (completed: number, total: number) => void
): Promise<ImageResult[]> {
  if (requests.length === 0) {
    return [];
  }

  console.log(`[image-generator] Generating batch of ${requests.length} images`);

  const results: ImageResult[] = [];
  const cache = getImageCache();
  let cachedCount = 0;
  let generatedCount = 0;
  let failedCount = 0;

  // Generate images sequentially to respect rate limits
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];

    // Check cache first to provide quick progress
    const cacheKey = createCacheKey({
      style: request.style,
      grade: context?.grade || "3",
      subject: context?.subject || "general",
      size: request.size,
      description: request.prompt,
      theme: context?.theme,
    });

    if (cache.has(cacheKey)) {
      cachedCount++;
    }

    try {
      const result = await generateImage(request, context, options);
      results.push(result);

      if (result.base64Data.startsWith("placeholder:")) {
        failedCount++;
      } else {
        generatedCount++;
      }
    } catch (error) {
      console.error(`[image-generator] Failed to generate image ${i + 1}:`, error);
      // Add placeholder for failed image
      results.push(createPlaceholderImage(request.prompt, request.placementId));
      failedCount++;
    }

    onProgress?.(i + 1, requests.length);

    // Small delay between requests to avoid rate limiting (only if not cached)
    if (i < requests.length - 1 && !cache.has(cacheKey)) {
      await sleep(500);
    }
  }

  const successCount = generatedCount + cachedCount - failedCount;
  const cacheStats = cache.getStats();
  console.log(
    `[image-generator] Batch complete: ${successCount}/${requests.length} successful ` +
    `(cache hit rate: ${cache.getHitRate().toFixed(0)}%)`
  );

  return results;
}

/**
 * Generate batch images with detailed stats
 */
export async function generateBatchImagesWithStats(
  requests: ImageRequest[],
  context?: { grade?: Grade; subject?: string; theme?: string },
  options?: Partial<ResilienceOptions>,
  onProgress?: (completed: number, total: number) => void
): Promise<BatchGenerationResult> {
  const cache = getImageCache();
  const hitsBefore = cache.getStats().hits;

  const images = await generateBatchImages(requests, context, options, onProgress);

  const hitsAfter = cache.getStats().hits;
  const cached = hitsAfter - hitsBefore;
  const failed = images.filter((img) => img.base64Data.startsWith("placeholder:")).length;
  const generated = images.length - cached - failed;

  return {
    images,
    stats: {
      total: requests.length,
      generated,
      cached,
      failed,
    },
  };
}

/**
 * Create image requests from visual placements in a plan
 */
export function createImageRequestsFromPlacements(
  placements: ImagePlacement[],
  style: VisualStyle
): ImageRequest[] {
  return placements.map((placement) => ({
    prompt: placement.description,
    style,
    size: placement.size,
    placementId: placement.afterItemId,
  }));
}

/**
 * Estimate credits for image generation
 */
export function estimateImageCredits(imageCount: number): number {
  // DALL-E 3 costs approximately 0.04-0.08 per image
  // We'll charge 0.5 credits per image for simplicity
  return Math.ceil(imageCount * 0.5);
}

/**
 * Check if image generation is available
 */
export function isImageGenerationAvailable(): boolean {
  try {
    return getImageProvider().isAvailable();
  } catch {
    return false;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create a placeholder image result for failed generations
 */
function createPlaceholderImage(description: string, placementId?: string): ImageResult {
  // Create a simple SVG placeholder
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
  <rect width="200" height="150" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
  <text x="100" y="70" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
    [Image: ${escapeXml(description.slice(0, 30))}...]
  </text>
  <text x="100" y="90" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">
    (placeholder)
  </text>
</svg>`.trim();

  // Convert SVG to base64
  const base64 = Buffer.from(svg).toString("base64");

  return {
    base64Data: `placeholder:${base64}`,
    mediaType: "image/png", // Will be rendered as SVG but typed as PNG for compatibility
    width: 200,
    height: 150,
    placementId,
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// For testing: reset provider
export function resetImageClient(): void {
  activeProvider = null;
}

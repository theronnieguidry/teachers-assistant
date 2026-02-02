/**
 * Image Cache Service
 *
 * Caches generated premium images to prevent redundant API calls
 * and reduce credit consumption for repeated prompts.
 */

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type { ImageResult, VisualStyle, Grade } from "../../types/premium.js";

// ============================================
// Types
// ============================================

export interface CacheEntry {
  hash: string;
  image: ImageResult;
  createdAt: Date;
  expiresAt: Date;
  metadata: {
    style: string;
    grade: string;
    subject: string;
    size: string;
    description: string;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

export interface CacheOptions {
  ttlDays?: number; // Default: 30
  maxEntries?: number; // Default: 1000
  persistPath?: string; // Optional disk persistence
}

// ============================================
// Constants
// ============================================

const DEFAULT_TTL_DAYS = 30;
const DEFAULT_MAX_ENTRIES = 1000;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// ============================================
// ImageCache Class
// ============================================

export class ImageCache {
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    entries: 0,
  };
  private ttlDays: number;
  private maxEntries: number;
  private persistPath?: string;
  private pruneTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.ttlDays = options.ttlDays || DEFAULT_TTL_DAYS;
    this.maxEntries = options.maxEntries || DEFAULT_MAX_ENTRIES;
    this.persistPath = options.persistPath;

    // Start periodic pruning
    this.pruneTimer = setInterval(() => {
      this.prune();
    }, PRUNE_INTERVAL_MS);

    // Load from disk if persistence enabled
    if (this.persistPath) {
      this.loadFromDisk().catch((err) => {
        console.log("[image-cache] No existing cache found or error loading:", err.message);
      });
    }
  }

  /**
   * Generate a deterministic hash for cache key
   */
  static generateHash(
    style: string,
    grade: string,
    subject: string,
    size: string,
    description: string,
    theme?: string
  ): string {
    // Normalize inputs
    const normalized = [
      style.toLowerCase().trim(),
      grade.toString().toLowerCase().trim(),
      subject.toLowerCase().trim(),
      size.toLowerCase().trim(),
      description.toLowerCase().trim(),
      (theme || "").toLowerCase().trim(),
    ].join("|");

    return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 32);
  }

  /**
   * Get cached image by hash
   */
  get(hash: string): ImageResult | null {
    const entry = this.cache.get(hash);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(hash);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    this.stats.hits++;
    console.log(`[image-cache] Cache hit for "${entry.metadata.description.slice(0, 30)}..."`);
    return entry.image;
  }

  /**
   * Check if hash exists in cache
   */
  has(hash: string): boolean {
    const entry = this.cache.get(hash);
    if (!entry) return false;
    if (new Date() > entry.expiresAt) {
      this.cache.delete(hash);
      this.updateStats();
      return false;
    }
    return true;
  }

  /**
   * Store image in cache
   */
  set(
    hash: string,
    image: ImageResult,
    metadata: CacheEntry["metadata"]
  ): void {
    // Skip placeholders
    if (image.base64Data.startsWith("placeholder:")) {
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlDays * 24 * 60 * 60 * 1000);

    const entry: CacheEntry = {
      hash,
      image,
      createdAt: now,
      expiresAt,
      metadata,
    };

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(hash, entry);
    this.updateStats();

    console.log(`[image-cache] Cached image "${metadata.description.slice(0, 30)}..." (${this.cache.size} entries)`);

    // Persist to disk if enabled
    if (this.persistPath) {
      this.saveToDisk().catch((err) => {
        console.error("[image-cache] Failed to persist cache:", err.message);
      });
    }
  }

  /**
   * Get or generate image (cache-through pattern)
   */
  async getOrGenerate(
    hash: string,
    metadata: CacheEntry["metadata"],
    generator: () => Promise<ImageResult>
  ): Promise<{ image: ImageResult; cached: boolean }> {
    // Check cache first
    const cached = this.get(hash);
    if (cached) {
      return { image: cached, cached: true };
    }

    // Generate new image
    const image = await generator();

    // Cache result (if not placeholder)
    this.set(hash, image, metadata);

    return { image, cached: false };
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const now = new Date();
    let pruned = 0;

    for (const [hash, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(hash);
        pruned++;
      }
    }

    if (pruned > 0) {
      console.log(`[image-cache] Pruned ${pruned} expired entries`);
      this.updateStats();
    }

    return pruned;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
    };
    console.log("[image-cache] Cache cleared");
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get hit rate as percentage
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Stop the cache (cleanup)
   */
  stop(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private evictOldest(): void {
    let oldestHash: string | null = null;
    let oldestDate: Date | null = null;

    for (const [hash, entry] of this.cache.entries()) {
      if (!oldestDate || entry.createdAt < oldestDate) {
        oldestDate = entry.createdAt;
        oldestHash = hash;
      }
    }

    if (oldestHash) {
      this.cache.delete(oldestHash);
      console.log("[image-cache] Evicted oldest entry to make room");
    }
  }

  private updateStats(): void {
    let size = 0;
    let oldest: Date | undefined;
    let newest: Date | undefined;

    for (const entry of this.cache.values()) {
      // Estimate size from base64
      size += Math.ceil(entry.image.base64Data.length * 0.75);

      if (!oldest || entry.createdAt < oldest) {
        oldest = entry.createdAt;
      }
      if (!newest || entry.createdAt > newest) {
        newest = entry.createdAt;
      }
    }

    this.stats.size = size;
    this.stats.entries = this.cache.size;
    this.stats.oldestEntry = oldest;
    this.stats.newestEntry = newest;
  }

  private async loadFromDisk(): Promise<void> {
    if (!this.persistPath) return;

    const indexPath = path.join(this.persistPath, "cache-index.json");
    const indexData = await fs.readFile(indexPath, "utf-8");
    const entries: CacheEntry[] = JSON.parse(indexData);

    const now = new Date();
    let loaded = 0;
    let skipped = 0;

    for (const entry of entries) {
      // Convert date strings back to Date objects
      entry.createdAt = new Date(entry.createdAt);
      entry.expiresAt = new Date(entry.expiresAt);

      // Skip expired entries
      if (now > entry.expiresAt) {
        skipped++;
        continue;
      }

      this.cache.set(entry.hash, entry);
      loaded++;
    }

    this.updateStats();
    console.log(`[image-cache] Loaded ${loaded} entries from disk (${skipped} expired)`);
  }

  private async saveToDisk(): Promise<void> {
    if (!this.persistPath) return;

    // Ensure directory exists
    await fs.mkdir(this.persistPath, { recursive: true });

    const entries = Array.from(this.cache.values());
    const indexPath = path.join(this.persistPath, "cache-index.json");

    await fs.writeFile(indexPath, JSON.stringify(entries, null, 2));
  }
}

// ============================================
// Singleton Instance
// ============================================

// Default cache instance for the application
let defaultCache: ImageCache | null = null;

export function getImageCache(): ImageCache {
  if (!defaultCache) {
    // Determine persist path from environment or default
    const persistPath = process.env.IMAGE_CACHE_PATH || undefined;

    defaultCache = new ImageCache({
      ttlDays: DEFAULT_TTL_DAYS,
      maxEntries: DEFAULT_MAX_ENTRIES,
      persistPath,
    });
  }
  return defaultCache;
}

/**
 * Reset the default cache (for testing)
 */
export function resetImageCache(): void {
  if (defaultCache) {
    defaultCache.stop();
    defaultCache.clear();
    defaultCache = null;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create cache key from image request parameters
 */
export function createCacheKey(params: {
  style: VisualStyle;
  grade: Grade;
  subject: string;
  size: string;
  description: string;
  theme?: string;
}): string {
  return ImageCache.generateHash(
    params.style,
    params.grade,
    params.subject,
    params.size,
    params.description,
    params.theme
  );
}

/**
 * Get cache metadata from request parameters
 */
export function createCacheMetadata(params: {
  style: VisualStyle;
  grade: Grade;
  subject: string;
  size: string;
  description: string;
}): CacheEntry["metadata"] {
  return {
    style: params.style,
    grade: params.grade,
    subject: params.subject,
    size: params.size,
    description: params.description,
  };
}

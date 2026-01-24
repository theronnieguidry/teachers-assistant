import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchImage, processVisualPlaceholders, clearImageCache } from "../../services/image-service.js";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Image Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    clearImageCache();
    process.env = { ...originalEnv };
    process.env.PIXABAY_API_KEY = "test-api-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const mockPixabayResponse = (hits: Array<{ webformatURL: string; previewURL: string; tags: string }>) => {
    return {
      ok: true,
      json: vi.fn().mockResolvedValue({
        hits,
        totalHits: hits.length,
      }),
    };
  };

  describe("searchImage()", () => {
    it("should return null when PIXABAY_API_KEY is not set", async () => {
      delete process.env.PIXABAY_API_KEY;

      const result = await searchImage("cute dog");

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return image URL when Pixabay returns results", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/image1.jpg", previewURL: "preview.jpg", tags: "dog" },
        ])
      );

      const result = await searchImage("cute dog");

      expect(result).toBe("https://pixabay.com/image1.jpg");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should try illustration type first, then any type", async () => {
      // First call (illustration) returns no results
      mockFetch.mockResolvedValueOnce(mockPixabayResponse([]));
      // Second call (any type) returns results
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/photo.jpg", previewURL: "preview.jpg", tags: "cat" },
        ])
      );

      const result = await searchImage("cute cat");

      expect(result).toBe("https://pixabay.com/photo.jpg");
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // First call should have image_type=illustration
      const firstCallUrl = mockFetch.mock.calls[0][0];
      expect(firstCallUrl).toContain("image_type=illustration");

      // Second call should not have image_type
      const secondCallUrl = mockFetch.mock.calls[1][0];
      expect(secondCallUrl).not.toContain("image_type=illustration");
    });

    it("should use simplified search terms as fallback when no results found", async () => {
      // First three calls return no results
      mockFetch.mockResolvedValueOnce(mockPixabayResponse([])); // illustration
      mockFetch.mockResolvedValueOnce(mockPixabayResponse([])); // any type
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/simple.jpg", previewURL: "preview.jpg", tags: "animal" },
        ])
      );

      const result = await searchImage("very cute adorable dog");

      expect(result).toBe("https://pixabay.com/simple.jpg");
      // At least 3 calls: illustration, any type, and simplified terms
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it("should return cached URL for repeated queries", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/cached.jpg", previewURL: "preview.jpg", tags: "bird" },
        ])
      );

      // First call
      const result1 = await searchImage("blue bird");
      // Second call with same query
      const result2 = await searchImage("blue bird");

      expect(result1).toBe("https://pixabay.com/cached.jpg");
      expect(result2).toBe("https://pixabay.com/cached.jpg");
      // Only one fetch call (second was served from cache)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should return null when no images found after all attempts", async () => {
      // All calls return empty results
      mockFetch.mockResolvedValue(mockPixabayResponse([]));

      const result = await searchImage("xyz nonexistent thing");

      expect(result).toBeNull();
    });

    it("should handle Pixabay API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });

      const result = await searchImage("test image");

      expect(result).toBeNull();
    });

    it("should handle network timeout gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("AbortError: The operation was aborted"));

      const result = await searchImage("timeout test");

      expect(result).toBeNull();
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await searchImage("network error test");

      expect(result).toBeNull();
    });

    it("should normalize query by removing special characters", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/normal.jpg", previewURL: "preview.jpg", tags: "test" },
        ])
      );

      await searchImage("Test! @Image# $With% Special^& Characters*");

      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).not.toContain("!");
      expect(fetchUrl).not.toContain("@");
      expect(fetchUrl).not.toContain("#");
    });

    it("should limit query to 5 words", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/limited.jpg", previewURL: "preview.jpg", tags: "test" },
        ])
      );

      await searchImage("one two three four five six seven eight");

      const fetchUrl = mockFetch.mock.calls[0][0];
      // Query should only have 5 words joined with + (URL-encoded as %2B)
      // Decode URL to check the query parameter
      const decodedUrl = decodeURIComponent(fetchUrl);
      expect(decodedUrl).toContain("q=one+two+three+four+five");
      expect(decodedUrl).not.toContain("six");
    });

    it("should return null for empty description", async () => {
      const result = await searchImage("");

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return null for whitespace-only description", async () => {
      const result = await searchImage("   ");

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle JSON parse errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      });

      const result = await searchImage("json error test");

      expect(result).toBeNull();
    });

    it("should call Pixabay API with safesearch enabled", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/safe.jpg", previewURL: "preview.jpg", tags: "safe" },
        ])
      );

      await searchImage("test");

      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain("safesearch=true");
    });

    it("should include API key in request", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/test.jpg", previewURL: "preview.jpg", tags: "test" },
        ])
      );

      await searchImage("test");

      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain("key=test-api-key");
    });

    it("should request English language results", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/english.jpg", previewURL: "preview.jpg", tags: "test" },
        ])
      );

      await searchImage("test");

      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain("lang=en");
    });
  });

  describe("processVisualPlaceholders()", () => {
    it("should return unchanged HTML when no placeholders exist", async () => {
      const html = "<div>Hello World</div>";

      const result = await processVisualPlaceholders(html);

      expect(result).toBe(html);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should replace [VISUAL: description] with img tag when image found", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/dog.jpg", previewURL: "preview.jpg", tags: "dog" },
        ])
      );

      const html = '<div>Look at this: [VISUAL: cute dog]</div>';
      const result = await processVisualPlaceholders(html);

      expect(result).toContain('<img src="https://pixabay.com/dog.jpg"');
      expect(result).toContain('alt="cute dog"');
      expect(result).not.toContain("[VISUAL:");
    });

    it("should handle multiple placeholders", async () => {
      mockFetch
        .mockResolvedValueOnce(
          mockPixabayResponse([
            { webformatURL: "https://pixabay.com/cat.jpg", previewURL: "preview.jpg", tags: "cat" },
          ])
        )
        .mockResolvedValueOnce(
          mockPixabayResponse([
            { webformatURL: "https://pixabay.com/bird.jpg", previewURL: "preview.jpg", tags: "bird" },
          ])
        );

      const html = "<div>[VISUAL: cute cat] and [VISUAL: blue bird]</div>";
      const result = await processVisualPlaceholders(html);

      expect(result).toContain("https://pixabay.com/cat.jpg");
      expect(result).toContain("https://pixabay.com/bird.jpg");
      expect(result).not.toContain("[VISUAL:");
    });

    it("should create placeholder box when no image found", async () => {
      mockFetch.mockResolvedValue(mockPixabayResponse([]));

      const html = '<div>[VISUAL: nonexistent thing xyz123]</div>';
      const result = await processVisualPlaceholders(html);

      expect(result).toContain("border: 2px dashed #ccc");
      expect(result).toContain("nonexistent thing xyz123");
      expect(result).not.toContain("[VISUAL:");
    });

    it("should preserve other HTML content", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/test.jpg", previewURL: "preview.jpg", tags: "test" },
        ])
      );

      const html = `
        <html>
          <head><title>Test</title></head>
          <body>
            <h1>Welcome</h1>
            <p>This is a paragraph.</p>
            [VISUAL: test image]
            <p>More content here.</p>
          </body>
        </html>
      `;

      const result = await processVisualPlaceholders(html);

      expect(result).toContain("<title>Test</title>");
      expect(result).toContain("<h1>Welcome</h1>");
      expect(result).toContain("<p>This is a paragraph.</p>");
      expect(result).toContain("<p>More content here.</p>");
      expect(result).toContain("https://pixabay.com/test.jpg");
    });

    it("should handle case-insensitive VISUAL tag", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/case.jpg", previewURL: "preview.jpg", tags: "test" },
        ])
      );

      const html = "<div>[visual: lowercase test]</div>";
      const result = await processVisualPlaceholders(html);

      expect(result).toContain("https://pixabay.com/case.jpg");
      expect(result).not.toContain("[visual:");
    });

    it("should handle VISUAL tag with extra whitespace", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/space.jpg", previewURL: "preview.jpg", tags: "test" },
        ])
      );

      const html = "<div>[VISUAL:   whitespace test   ]</div>";
      const result = await processVisualPlaceholders(html);

      expect(result).toContain("https://pixabay.com/space.jpg");
      expect(result).toContain('alt="whitespace test"');
    });

    it("should set appropriate image dimensions", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/sized.jpg", previewURL: "preview.jpg", tags: "test" },
        ])
      );

      const html = "<div>[VISUAL: test]</div>";
      const result = await processVisualPlaceholders(html);

      expect(result).toContain("max-width: 200px");
      expect(result).toContain("max-height: 150px");
    });

    it("should center images with display: block and margin: auto", async () => {
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/centered.jpg", previewURL: "preview.jpg", tags: "test" },
        ])
      );

      const html = "<div>[VISUAL: test]</div>";
      const result = await processVisualPlaceholders(html);

      expect(result).toContain("display: block");
      expect(result).toContain("margin: 10px auto");
    });

    it("should handle mixed found and not-found images", async () => {
      // First image found
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/found.jpg", previewURL: "preview.jpg", tags: "found" },
        ])
      );
      // Second image not found (all attempts)
      mockFetch.mockResolvedValue(mockPixabayResponse([]));

      const html = "<div>[VISUAL: found image] and [VISUAL: notfound xyz123]</div>";
      const result = await processVisualPlaceholders(html);

      expect(result).toContain("https://pixabay.com/found.jpg");
      expect(result).toContain("border: 2px dashed #ccc");
    });
  });

  describe("clearImageCache()", () => {
    it("should clear the image cache", async () => {
      // First, populate the cache
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/cached.jpg", previewURL: "preview.jpg", tags: "test" },
        ])
      );

      await searchImage("cache test");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear the cache
      clearImageCache();

      // Same query should now call fetch again (cache was cleared)
      mockFetch.mockResolvedValueOnce(
        mockPixabayResponse([
          { webformatURL: "https://pixabay.com/new.jpg", previewURL: "preview.jpg", tags: "test" },
        ])
      );

      const result = await searchImage("cache test");

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toBe("https://pixabay.com/new.jpg");
    });

    it("should allow multiple clear operations", () => {
      // Should not throw
      clearImageCache();
      clearImageCache();
      clearImageCache();
    });
  });

  describe("Cache Expiration", () => {
    it("should return fresh data when cache is expired", async () => {
      // Mock Date.now to control cache timing
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = () => currentTime;

      try {
        // First call - populates cache
        mockFetch.mockResolvedValueOnce(
          mockPixabayResponse([
            { webformatURL: "https://pixabay.com/old.jpg", previewURL: "preview.jpg", tags: "test" },
          ])
        );

        await searchImage("expiration test");

        // Fast forward 25 hours (past 24 hour cache duration)
        currentTime += 25 * 60 * 60 * 1000;

        // Second call with expired cache
        mockFetch.mockResolvedValueOnce(
          mockPixabayResponse([
            { webformatURL: "https://pixabay.com/new.jpg", previewURL: "preview.jpg", tags: "test" },
          ])
        );

        const result = await searchImage("expiration test");

        // Should have fetched fresh data
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result).toBe("https://pixabay.com/new.jpg");
      } finally {
        Date.now = originalDateNow;
      }
    });

    it("should return cached data when cache is not expired", async () => {
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = () => currentTime;

      try {
        // First call - populates cache
        mockFetch.mockResolvedValueOnce(
          mockPixabayResponse([
            { webformatURL: "https://pixabay.com/cached.jpg", previewURL: "preview.jpg", tags: "test" },
          ])
        );

        await searchImage("still valid test");

        // Fast forward 23 hours (within 24 hour cache duration)
        currentTime += 23 * 60 * 60 * 1000;

        const result = await searchImage("still valid test");

        // Should have used cache (only 1 fetch call)
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result).toBe("https://pixabay.com/cached.jpg");
      } finally {
        Date.now = originalDateNow;
      }
    });
  });
});

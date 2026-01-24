/**
 * Image Service - Fetches stock images from Pixabay to replace [VISUAL: description] placeholders
 */

// Simple in-memory cache for image URLs (24-hour cache as required by Pixabay TOS)
const imageCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface PixabayHit {
  webformatURL: string;
  previewURL: string;
  tags: string;
}

interface PixabayResponse {
  hits: PixabayHit[];
  totalHits: number;
}

/**
 * Search Pixabay for an image matching the description
 * Returns the image URL or null if no match found
 */
export async function searchImage(description: string): Promise<string | null> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    console.warn("PIXABAY_API_KEY not set - skipping image injection");
    return null;
  }

  // Normalize the search query
  const query = description
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove special characters
    .trim()
    .split(/\s+/)
    .slice(0, 5) // Limit to 5 words for better matches
    .join("+");

  if (!query) return null;

  // Check cache first
  const cached = imageCache.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      q: query,
      image_type: "illustration", // Child-friendly clipart style
      safesearch: "true",
      per_page: "3",
      lang: "en",
    });

    const response = await fetch(`https://pixabay.com/api/?${params}`, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.error(`Pixabay API error: ${response.status}`);
      return null;
    }

    const data: PixabayResponse = await response.json();

    if (data.hits && data.hits.length > 0) {
      // Use webformatURL for good quality, reasonable size
      const imageUrl = data.hits[0].webformatURL;

      // Cache the result
      imageCache.set(query, { url: imageUrl, timestamp: Date.now() });

      return imageUrl;
    }

    // No results - try a broader search without "illustration" filter
    const fallbackParams = new URLSearchParams({
      key: apiKey,
      q: query,
      safesearch: "true",
      per_page: "3",
      lang: "en",
    });

    const fallbackResponse = await fetch(`https://pixabay.com/api/?${fallbackParams}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (fallbackResponse.ok) {
      const fallbackData: PixabayResponse = await fallbackResponse.json();
      if (fallbackData.hits && fallbackData.hits.length > 0) {
        const imageUrl = fallbackData.hits[0].webformatURL;
        imageCache.set(query, { url: imageUrl, timestamp: Date.now() });
        return imageUrl;
      }
    }

    return null;
  } catch (error) {
    console.error("Image search error:", error);
    return null;
  }
}

/**
 * Process HTML content and replace all [VISUAL: description] placeholders with actual images
 */
export async function processVisualPlaceholders(html: string): Promise<string> {
  // Find all [VISUAL: ...] placeholders
  const visualRegex = /\[VISUAL:\s*([^\]]+)\]/gi;
  const matches = [...html.matchAll(visualRegex)];

  if (matches.length === 0) {
    return html;
  }

  console.log(`Found ${matches.length} visual placeholder(s) to process`);

  // Process each placeholder
  let result = html;
  for (const match of matches) {
    const fullMatch = match[0];
    const description = match[1].trim();

    const imageUrl = await searchImage(description);

    if (imageUrl) {
      // Replace placeholder with an image tag
      const imgTag = `<img src="${imageUrl}" alt="${description}" style="max-width: 200px; max-height: 150px; margin: 10px auto; display: block;" />`;
      result = result.replace(fullMatch, imgTag);
      console.log(`  Replaced "${description}" with image`);
    } else {
      // Keep the placeholder text but style it as a placeholder box
      const placeholderBox = `<div style="border: 2px dashed #ccc; padding: 20px; margin: 10px auto; max-width: 200px; text-align: center; color: #666; font-style: italic;">${description}</div>`;
      result = result.replace(fullMatch, placeholderBox);
      console.log(`  No image found for "${description}" - using placeholder box`);
    }
  }

  return result;
}

/**
 * Clear the image cache (for testing)
 */
export function clearImageCache(): void {
  imageCache.clear();
}

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
 * Extract simplified search terms from a complex description.
 * Returns fallback terms to try if the original search fails.
 */
function simplifySearchTerm(description: string): string[] {
  // Common stop words to remove
  const stopWords = ['a', 'an', 'the', 'or', 'and', 'of', 'for', 'with', 'to', 'in', 'on'];

  const words = description.toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')  // Keep hyphens for compound words
    .split(/[\s-]+/)              // Split on spaces and hyphens
    .filter(w => w.length > 2 && !stopWords.includes(w));

  const fallbacks: string[] = [];

  // Try pairs of words (more specific)
  if (words.length >= 2) {
    fallbacks.push(words.slice(0, 2).join(' '));
  }

  // Try individual words (most generic)
  for (const word of words) {
    if (word.length > 3) {
      fallbacks.push(word);
    }
  }

  return fallbacks;
}

/**
 * Fetch an image URL from Pixabay API
 */
async function fetchFromPixabay(
  query: string,
  apiKey: string,
  useIllustration: boolean
): Promise<string | null> {
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    safesearch: "true",
    per_page: "3",
    lang: "en",
    ...(useIllustration && { image_type: "illustration" }),
  });

  const response = await fetch(`https://pixabay.com/api/?${params}`, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) return null;

  const data: PixabayResponse = await response.json();
  return data.hits?.[0]?.webformatURL || null;
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
    // Try 1: Illustration-type images (child-friendly clipart)
    let imageUrl = await fetchFromPixabay(query, apiKey, true);
    if (imageUrl) {
      imageCache.set(query, { url: imageUrl, timestamp: Date.now() });
      return imageUrl;
    }

    // Try 2: Any image type (broader search)
    imageUrl = await fetchFromPixabay(query, apiKey, false);
    if (imageUrl) {
      imageCache.set(query, { url: imageUrl, timestamp: Date.now() });
      return imageUrl;
    }

    // Try 3: Simplified search terms (word pairs, then individual words)
    const simplifiedTerms = simplifySearchTerm(description);
    for (const term of simplifiedTerms) {
      const normalizedTerm = term.split(/\s+/).join("+");
      console.log(`    Trying simplified search: "${term}"`);
      imageUrl = await fetchFromPixabay(normalizedTerm, apiKey, false);
      if (imageUrl) {
        console.log(`    Found image using simplified term: "${term}"`);
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

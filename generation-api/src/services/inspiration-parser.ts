import type { InspirationItem, ParsedInspiration } from "../types.js";
import {
  generateContent,
  analyzeImageWithVision,
  supportsVision,
  type AIProviderConfig,
  type VisionImage,
} from "./ai-provider.js";
import { buildInspirationParsePrompt } from "../prompts/templates.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

// Prompt for analyzing educational material design from images
const DESIGN_ANALYSIS_PROMPT = `Analyze this educational material's visual design and provide a concise style guide that can be used to create similar worksheets.

Describe:
1. COLOR SCHEME: Primary colors, accent colors, background colors (with approximate hex codes if possible)
2. TYPOGRAPHY: Heading style (bold, playful, formal), text hierarchy
3. LAYOUT: Column structure, spacing, margins, alignment
4. VISUAL ELEMENTS: Border styles, icons, illustrations style (cartoon, realistic, line art)
5. OVERALL AESTHETIC: (e.g., "playful and colorful", "clean and minimal", "fun with hand-drawn feel")

Format as a brief design guide that an AI can follow when generating HTML/CSS for worksheets.`;

const MAX_CONTENT_LENGTH = 10000;

// Extract text content from base64-encoded PDF
async function extractPdfText(base64Content: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Content, "base64");
    const data = await pdf(buffer);
    const text = data.text.trim();

    if (text.length > MAX_CONTENT_LENGTH) {
      return text.substring(0, MAX_CONTENT_LENGTH) + "...";
    }
    return text || "[PDF contained no extractable text]";
  } catch (error) {
    console.error("Failed to extract PDF text:", error);
    return "[PDF text extraction failed]";
  }
}

export async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TA-TeacherAssistant/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      const html = await response.text();
      // Extract text content from HTML (simple extraction)
      return extractTextFromHtml(html);
    } else if (contentType.includes("text/plain")) {
      return response.text();
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to fetch URL content: ${message}`);
  }
}

function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Limit length
  if (text.length > MAX_CONTENT_LENGTH) {
    text = text.substring(0, MAX_CONTENT_LENGTH) + "...";
  }

  return text;
}

export async function parseInspiration(
  item: InspirationItem,
  aiConfig: AIProviderConfig
): Promise<ParsedInspiration> {
  let content = "";

  switch (item.type) {
    case "url":
      if (!item.sourceUrl) {
        throw new Error("URL inspiration item missing sourceUrl");
      }
      content = await fetchUrlContent(item.sourceUrl);
      break;

    case "text":
      content = item.content || "";
      break;

    case "pdf":
      // Check if content is base64-encoded PDF data (substantial length)
      if (item.content && item.content.length > 100) {
        content = await extractPdfText(item.content);
      } else {
        content = item.content || "[PDF content not available]";
      }
      break;

    case "image":
      // Use vision API if provider supports it and we have base64 content
      if (item.content && supportsVision(aiConfig.provider)) {
        const mediaType = (item.storagePath || "image/png") as VisionImage["mediaType"];
        try {
          const response = await analyzeImageWithVision(
            DESIGN_ANALYSIS_PROMPT,
            [{ mediaType, base64Data: item.content }],
            { ...aiConfig, maxTokens: 500 }
          );
          content = response.content;
        } catch (error) {
          console.error("Vision analysis failed:", error);
          content = `[Image: ${item.title}]`;
        }
      } else {
        // Fallback for providers without vision support (e.g., Ollama)
        content = `[Image: ${item.title}]`;
      }
      break;

    default:
      content = item.content || "";
  }

  // If content is minimal, just return it directly
  if (content.length < 100) {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      extractedContent: content,
    };
  }

  // Use AI to summarize and extract key educational content
  try {
    const prompt = buildInspirationParsePrompt(content, item.type);
    const response = await generateContent(prompt, {
      ...aiConfig,
      maxTokens: 1000,
    });

    return {
      id: item.id,
      type: item.type,
      title: item.title,
      extractedContent: response.content,
    };
  } catch (error) {
    // If AI parsing fails, use truncated raw content
    console.error("Failed to parse inspiration with AI:", error);
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      extractedContent: content.substring(0, 2000),
    };
  }
}

export async function parseAllInspiration(
  items: InspirationItem[],
  aiConfig: AIProviderConfig
): Promise<ParsedInspiration[]> {
  const results: ParsedInspiration[] = [];

  for (const item of items) {
    try {
      const parsed = await parseInspiration(item, aiConfig);
      results.push(parsed);
    } catch (error) {
      console.error(`Failed to parse inspiration ${item.id}:`, error);
      // Add a placeholder for failed items
      results.push({
        id: item.id,
        type: item.type,
        title: item.title,
        extractedContent: `[Failed to parse: ${item.title}]`,
      });
    }
  }

  return results;
}

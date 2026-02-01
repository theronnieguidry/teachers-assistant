import type { InspirationItem, ParsedInspiration } from "../types.js";
import {
  generateContent,
  analyzeImageWithVision,
  supportsVision,
  type AIProviderConfig,
  type VisionImage,
} from "./ai-provider.js";
import { buildInspirationParsePrompt } from "../prompts/templates.js";
import { chromium, type Browser } from "playwright";
import { createCanvas } from "canvas";
// Use legacy build of pdfjs for Node.js compatibility
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFParse } from "pdf-parse";

// Reusable browser instance for screenshots
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

// Cleanup browser on process exit
process.on("exit", () => {
  browserInstance?.close();
});

// Screenshot a URL for visual design analysis
async function getUrlScreenshot(url: string): Promise<VisionImage | null> {
  try {
    const browser = await getBrowser();
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
    });
    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    // Take screenshot as PNG (medium quality, good for design analysis)
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false, // Just viewport, not full page
    });

    await context.close();

    return {
      mediaType: "image/png",
      base64Data: screenshot.toString("base64"),
    };
  } catch (error) {
    console.error("Failed to screenshot URL:", error);
    return null;
  }
}

// Render first page of PDF as an image for visual design analysis
async function getPdfPageAsImage(base64Content: string): Promise<VisionImage | null> {
  try {
    const buffer = Buffer.from(base64Content, "base64");
    const uint8Array = new Uint8Array(buffer);

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;

    // Get the first page
    const page = await pdfDocument.getPage(1);

    // Set scale for medium quality (1.5 is a good balance of quality and size)
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    // Create a canvas with the page dimensions
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");

    // Render the page to the canvas
    await page.render({
      // @ts-expect-error - node-canvas context is compatible with pdfjs
      canvasContext: context,
      viewport,
    }).promise;

    // Convert canvas to PNG base64
    const pngBuffer = canvas.toBuffer("image/png");

    return {
      mediaType: "image/png",
      base64Data: pngBuffer.toString("base64"),
    };
  } catch (error) {
    console.error("Failed to render PDF page:", error);
    return null;
  }
}

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
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    const text = result.text.trim();

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
      // Always extract text content as fallback
      content = await fetchUrlContent(item.sourceUrl);

      // If provider supports vision, also capture and analyze the visual design
      if (supportsVision(aiConfig.provider)) {
        const screenshot = await getUrlScreenshot(item.sourceUrl);
        if (screenshot) {
          try {
            const designAnalysis = await analyzeImageWithVision(
              DESIGN_ANALYSIS_PROMPT,
              [screenshot],
              { ...aiConfig, maxTokens: 500 }
            );
            content = `DESIGN ANALYSIS:\n${designAnalysis.content}\n\nTEXT CONTENT:\n${content}`;
          } catch (error) {
            console.error("URL vision analysis failed:", error);
            // Continue with text content only
          }
        }
      }
      break;

    case "text":
      content = item.content || "";
      break;

    case "pdf":
      // Check if content is base64-encoded PDF data (substantial length)
      if (item.content && item.content.length > 100) {
        // Always extract text content as fallback
        content = await extractPdfText(item.content);

        // If provider supports vision, also render and analyze the visual design
        if (supportsVision(aiConfig.provider)) {
          const pdfImage = await getPdfPageAsImage(item.content);
          if (pdfImage) {
            try {
              const designAnalysis = await analyzeImageWithVision(
                DESIGN_ANALYSIS_PROMPT,
                [pdfImage],
                { ...aiConfig, maxTokens: 500 }
              );
              content = `DESIGN ANALYSIS:\n${designAnalysis.content}\n\nTEXT CONTENT:\n${content}`;
            } catch (error) {
              console.error("PDF vision analysis failed:", error);
              // Continue with text content only
            }
          }
        }
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

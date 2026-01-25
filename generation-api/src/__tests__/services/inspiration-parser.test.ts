import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pdf-parse via createRequire - must use vi.hoisted() to avoid hoisting issues
const { mockPdf } = vi.hoisted(() => ({
  mockPdf: vi.fn(),
}));

vi.mock("module", () => ({
  createRequire: () => (moduleName: string) => {
    if (moduleName === "pdf-parse") {
      return mockPdf;
    }
    throw new Error(`Unexpected require: ${moduleName}`);
  },
}));

// Mock AI provider with factory function
vi.mock("../../services/ai-provider.js", () => ({
  generateContent: vi.fn(),
  analyzeImageWithVision: vi.fn(),
  supportsVision: vi.fn(),
}));

import {
  fetchUrlContent,
  parseInspiration,
  parseAllInspiration,
} from "../../services/inspiration-parser.js";
import { generateContent, analyzeImageWithVision, supportsVision } from "../../services/ai-provider.js";

// Mock fetch
global.fetch = vi.fn();

describe("Inspiration Parser Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateContent).mockResolvedValue({
      content: "Summarized content about educational topics",
      inputTokens: 100,
      outputTokens: 50,
    });
    vi.mocked(analyzeImageWithVision).mockResolvedValue({
      content: "Design analysis: colorful layout with blue headers, playful fonts",
      inputTokens: 200,
      outputTokens: 100,
    });
    vi.mocked(supportsVision).mockImplementation((provider) =>
      provider === "claude" || provider === "openai"
    );
    mockPdf.mockResolvedValue({
      text: "This is a comprehensive educational PDF document containing detailed lesson plans, worksheets, and activities for elementary school students covering mathematics, reading, and science topics.",
      numpages: 2,
      numrender: 2,
      info: {},
      metadata: null,
      version: "1.0",
    });
  });

  describe("fetchUrlContent", () => {
    it("should fetch and extract text from HTML", async () => {
      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <h1>Hello World</h1>
            <p>This is a test paragraph.</p>
          </body>
        </html>
      `;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: {
          get: () => "text/html",
        },
        text: () => Promise.resolve(mockHtml),
      } as unknown as Response);

      const result = await fetchUrlContent("https://example.com");

      expect(result).toContain("Hello World");
      expect(result).toContain("test paragraph");
      expect(result).not.toContain("<html>");
    });

    it("should handle plain text content", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: {
          get: () => "text/plain",
        },
        text: () => Promise.resolve("Plain text content"),
      } as unknown as Response);

      const result = await fetchUrlContent("https://example.com/file.txt");

      expect(result).toBe("Plain text content");
    });

    it("should throw error for failed fetch", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(fetchUrlContent("https://example.com/notfound")).rejects.toThrow(
        "Failed to fetch URL: 404"
      );
    });

    it("should throw error for unsupported content type", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: {
          get: () => "application/octet-stream",
        },
      } as unknown as Response);

      await expect(fetchUrlContent("https://example.com/file.bin")).rejects.toThrow(
        "Unsupported content type"
      );
    });

    it("should remove script and style tags from HTML", async () => {
      const mockHtml = `
        <html>
          <script>alert('test');</script>
          <style>.test { color: red; }</style>
          <body><p>Actual content</p></body>
        </html>
      `;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: { get: () => "text/html" },
        text: () => Promise.resolve(mockHtml),
      } as unknown as Response);

      const result = await fetchUrlContent("https://example.com");

      expect(result).not.toContain("alert");
      expect(result).not.toContain("color: red");
      expect(result).toContain("Actual content");
    });

    it("should decode HTML entities", async () => {
      const mockHtml = "<p>Hello &amp; goodbye &lt;test&gt;</p>";

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: { get: () => "text/html" },
        text: () => Promise.resolve(mockHtml),
      } as unknown as Response);

      const result = await fetchUrlContent("https://example.com");

      expect(result).toContain("Hello & goodbye <test>");
    });
  });

  describe("parseInspiration", () => {
    const aiConfig = { provider: "claude" as const };

    it("should parse URL inspiration", async () => {
      // Content needs to be over 100 chars to trigger AI processing
      const mockHtml = "<html><body><p>This is a comprehensive educational resource covering mathematics, science, and language arts topics for elementary school students. It includes detailed lesson plans and activities.</p></body></html>";

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: { get: () => "text/html" },
        text: () => Promise.resolve(mockHtml),
      } as unknown as Response);

      const item = {
        id: "item-1",
        type: "url" as const,
        title: "Example",
        sourceUrl: "https://example.com",
      };

      const result = await parseInspiration(item, aiConfig);

      expect(result.id).toBe("item-1");
      expect(result.type).toBe("url");
      expect(result.title).toBe("Example");
      expect(result.extractedContent).toBe("Summarized content about educational topics");
    });

    it("should throw error for URL item without sourceUrl", async () => {
      const item = {
        id: "item-1",
        type: "url" as const,
        title: "Example",
      };

      await expect(parseInspiration(item, aiConfig)).rejects.toThrow(
        "URL inspiration item missing sourceUrl"
      );
    });

    it("should parse text inspiration", async () => {
      const item = {
        id: "item-1",
        type: "text" as const,
        title: "Text Note",
        content: "This is a long text content that needs to be summarized because it has more than 100 characters in it.",
      };

      const result = await parseInspiration(item, aiConfig);

      expect(result.id).toBe("item-1");
      expect(result.type).toBe("text");
      expect(result.extractedContent).toBe("Summarized content about educational topics");
    });

    it("should return short content directly without AI processing", async () => {
      const item = {
        id: "item-1",
        type: "text" as const,
        title: "Short Note",
        content: "Brief text",
      };

      const result = await parseInspiration(item, aiConfig);

      expect(result.extractedContent).toBe("Brief text");
    });

    it("should handle PDF with pre-extracted content", async () => {
      const item = {
        id: "item-1",
        type: "pdf" as const,
        title: "Document.pdf",
        // Content needs to be over 100 chars to trigger AI processing
        content: "This is the extracted PDF text content that covers multiple educational topics including mathematics, reading comprehension, and science experiments for young learners.",
      };

      const result = await parseInspiration(item, aiConfig);

      expect(result.type).toBe("pdf");
      expect(result.extractedContent).toBe("Summarized content about educational topics");
    });

    it("should extract text from base64-encoded PDF", async () => {
      // Simulate base64-encoded PDF content (more than 100 chars)
      const base64PdfContent = "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoK".padEnd(200, "A");

      const item = {
        id: "item-1",
        type: "pdf" as const,
        title: "worksheet.pdf",
        content: base64PdfContent,
      };

      const result = await parseInspiration(item, aiConfig);

      expect(mockPdf).toHaveBeenCalled();
      expect(result.type).toBe("pdf");
      // Should use AI to summarize the extracted text
      expect(result.extractedContent).toBe("Summarized content about educational topics");
    });

    it("should handle PDF extraction failure gracefully", async () => {
      mockPdf.mockRejectedValue(new Error("Invalid PDF"));

      const base64PdfContent = "invalid-base64-pdf-content".padEnd(200, "X");

      const item = {
        id: "item-1",
        type: "pdf" as const,
        title: "corrupted.pdf",
        content: base64PdfContent,
      };

      const result = await parseInspiration(item, aiConfig);

      expect(result.type).toBe("pdf");
      expect(result.extractedContent).toBe("[PDF text extraction failed]");
    });

    it("should handle image with placeholder content when no base64 data", async () => {
      const item = {
        id: "item-1",
        type: "image" as const,
        title: "diagram.png",
      };

      const result = await parseInspiration(item, aiConfig);

      expect(result.type).toBe("image");
      expect(result.extractedContent).toBe("[Image: diagram.png]");
    });

    it("should analyze image with vision API when provider supports it", async () => {
      const base64ImageContent = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const item = {
        id: "item-1",
        type: "image" as const,
        title: "worksheet-design.png",
        content: base64ImageContent,
        storagePath: "image/png",
      };

      const result = await parseInspiration(item, aiConfig);

      expect(vi.mocked(supportsVision)).toHaveBeenCalledWith("claude");
      expect(vi.mocked(analyzeImageWithVision)).toHaveBeenCalled();
      expect(result.type).toBe("image");
      expect(result.extractedContent).toContain("Design analysis");
    });

    it("should fallback to placeholder for image when provider does not support vision", async () => {
      const base64ImageContent = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

      const item = {
        id: "item-1",
        type: "image" as const,
        title: "photo.jpg",
        content: base64ImageContent,
        storagePath: "image/jpeg",
      };

      // Ollama doesn't support vision
      const ollamaConfig = { provider: "ollama" as const };

      const result = await parseInspiration(item, ollamaConfig);

      expect(vi.mocked(supportsVision)).toHaveBeenCalledWith("ollama");
      expect(vi.mocked(analyzeImageWithVision)).not.toHaveBeenCalled();
      expect(result.extractedContent).toBe("[Image: photo.jpg]");
    });

    it("should handle vision API failure gracefully", async () => {
      vi.mocked(analyzeImageWithVision).mockRejectedValue(new Error("Vision API error"));

      const base64ImageContent = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

      const item = {
        id: "item-1",
        type: "image" as const,
        title: "problematic.png",
        content: base64ImageContent,
        storagePath: "image/png",
      };

      const result = await parseInspiration(item, aiConfig);

      expect(result.type).toBe("image");
      expect(result.extractedContent).toBe("[Image: problematic.png]");
    });
  });

  describe("parseAllInspiration", () => {
    const aiConfig = { provider: "claude" as const };

    it("should parse all items and return results", async () => {
      const items = [
        { id: "1", type: "text" as const, title: "Note 1", content: "Short" },
        { id: "2", type: "text" as const, title: "Note 2", content: "Brief" },
      ];

      const results = await parseAllInspiration(items, aiConfig);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("1");
      expect(results[1].id).toBe("2");
    });

    it("should handle empty array", async () => {
      const results = await parseAllInspiration([], aiConfig);

      expect(results).toEqual([]);
    });

    it("should add placeholder for failed items", async () => {
      const items = [
        { id: "1", type: "url" as const, title: "Bad URL" }, // Missing sourceUrl
      ];

      const results = await parseAllInspiration(items, aiConfig);

      expect(results).toHaveLength(1);
      expect(results[0].extractedContent).toContain("Failed to parse");
    });
  });
});

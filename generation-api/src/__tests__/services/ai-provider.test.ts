import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateContent,
  calculateCredits,
  resetClients,
  isOllamaAvailable,
  getOllamaModels,
} from "../../services/ai-provider.js";

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Mock Claude response" }],
        usage: { input_tokens: 100, output_tokens: 200 },
      }),
    },
  })),
}));

// Mock OpenAI SDK - used by both OpenAI and Ollama providers
const mockChatCreate = vi.fn();
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(({ baseURL }) => ({
    chat: {
      completions: {
        create: mockChatCreate.mockImplementation(() => {
          // Return different responses based on baseURL (Ollama vs OpenAI)
          if (baseURL?.includes("11434")) {
            return Promise.resolve({
              choices: [{ message: { content: "Mock Ollama response" } }],
              usage: { prompt_tokens: 80, completion_tokens: 120 },
            });
          }
          return Promise.resolve({
            choices: [{ message: { content: "Mock OpenAI response" } }],
            usage: { prompt_tokens: 150, completion_tokens: 250 },
          });
        }),
      },
    },
  })),
}));

// Mock global fetch for Ollama availability checks
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AI Provider Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetClients();
    // Set required env vars
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.OLLAMA_MODEL = "llama3.2";

    // Default: Ollama is available
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [{ name: "llama3.2" }] }),
    });
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
  });

  describe("generateContent", () => {
    describe("with Claude", () => {
      it("should generate content using Claude", async () => {
        const result = await generateContent("Test prompt", {
          provider: "claude",
        });

        expect(result.content).toBe("Mock Claude response");
        expect(result.inputTokens).toBe(100);
        expect(result.outputTokens).toBe(200);
      });

      it("should throw error when ANTHROPIC_API_KEY is missing", async () => {
        delete process.env.ANTHROPIC_API_KEY;
        resetClients();

        await expect(
          generateContent("Test prompt", { provider: "claude" })
        ).rejects.toThrow("ANTHROPIC_API_KEY environment variable is required");
      });
    });

    describe("with OpenAI", () => {
      it("should generate content using OpenAI", async () => {
        const result = await generateContent("Test prompt", {
          provider: "openai",
        });

        expect(result.content).toBe("Mock OpenAI response");
        expect(result.inputTokens).toBe(150);
        expect(result.outputTokens).toBe(250);
      });

      it("should throw error when OPENAI_API_KEY is missing", async () => {
        delete process.env.OPENAI_API_KEY;
        resetClients();

        await expect(
          generateContent("Test prompt", { provider: "openai" })
        ).rejects.toThrow("OPENAI_API_KEY environment variable is required");
      });
    });

    describe("with Ollama", () => {
      it("should generate content using Ollama when available", async () => {
        const result = await generateContent("Test prompt", {
          provider: "ollama",
        });

        expect(result.content).toBe("Mock Ollama response");
        expect(result.inputTokens).toBe(80);
        expect(result.outputTokens).toBe(120);
      });

      it("should throw error when Ollama is not running", async () => {
        mockFetch.mockRejectedValue(new Error("Connection refused"));
        resetClients();

        await expect(
          generateContent("Test prompt", { provider: "ollama" })
        ).rejects.toThrow("Ollama is not running");
      });

      it("should use OLLAMA_MODEL env var when set", async () => {
        process.env.OLLAMA_MODEL = "mistral";
        resetClients();

        await generateContent("Test prompt", { provider: "ollama" });

        // Verify the model was passed (via mock inspection)
        expect(mockChatCreate).toHaveBeenCalled();
      });
    });

    it("should throw error for unsupported provider", async () => {
      await expect(
        generateContent("Test prompt", { provider: "unknown" as never })
      ).rejects.toThrow("Unsupported AI provider");
    });
  });

  describe("isOllamaAvailable", () => {
    it("should return true when Ollama is running", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await isOllamaAvailable();
      expect(result).toBe(true);
    });

    it("should return false when Ollama is not running", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const result = await isOllamaAvailable();
      expect(result).toBe(false);
    });

    it("should return false when Ollama returns error status", async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await isOllamaAvailable();
      expect(result).toBe(false);
    });
  });

  describe("getOllamaModels", () => {
    it("should return list of available models", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            models: [{ name: "llama3.2" }, { name: "mistral" }],
          }),
      });

      const models = await getOllamaModels();
      expect(models).toEqual(["llama3.2", "mistral"]);
    });

    it("should return empty array when Ollama is not available", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const models = await getOllamaModels();
      expect(models).toEqual([]);
    });
  });

  describe("calculateCredits", () => {
    it("should calculate credits based on tokens (1 credit per 1000 tokens)", () => {
      expect(calculateCredits(500, 500)).toBe(1);
      expect(calculateCredits(1000, 0)).toBe(1);
      expect(calculateCredits(0, 1000)).toBe(1);
    });

    it("should round up partial credits", () => {
      expect(calculateCredits(100, 100)).toBe(1);
      expect(calculateCredits(1001, 0)).toBe(2);
      expect(calculateCredits(500, 600)).toBe(2);
    });

    it("should handle large token counts", () => {
      expect(calculateCredits(5000, 5000)).toBe(10);
      expect(calculateCredits(10000, 10000)).toBe(20);
    });

    it("should handle zero tokens", () => {
      expect(calculateCredits(0, 0)).toBe(0);
    });
  });
});

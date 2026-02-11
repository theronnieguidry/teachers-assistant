import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateContent,
  calculateCredits,
  resetClients,
  isOllamaAvailable,
  getOllamaModels,
  supportsVision,
  analyzeImageWithVision,
  type VisionImage,
} from "../../services/ai-provider.js";

// Mock OpenAI SDK - used by both OpenAI and Ollama providers
const mockChatCreate = vi.fn();
const mockWarmupLocalModel = vi.fn();
const mockGetResolvedLocalModel = vi.fn();
const mockGetOllamaWarmupState = vi.fn();

vi.mock("../../services/ollama-model-manager.js", () => ({
  warmupLocalModel: () => mockWarmupLocalModel(),
  getResolvedLocalModel: () => mockGetResolvedLocalModel(),
  getOllamaWarmupState: () => mockGetOllamaWarmupState(),
}));

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
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";

    // Default: Ollama is available
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [{ name: "llama3.2" }] }),
    });

    mockGetOllamaWarmupState.mockReturnValue({
      localModelReady: true,
      reachable: true,
      activeModel: "llama3.1:8b",
      warmingUp: false,
      selectedPrimaryModel: "llama3.1:8b",
      fallbackModels: ["qwen2.5:7b", "gemma3:4b", "llama3.2"],
      autoPull: true,
      lastCheckedAt: "2026-02-11T00:00:00.000Z",
      lastError: null,
    });
    mockGetResolvedLocalModel.mockReturnValue("llama3.1:8b");
    mockWarmupLocalModel.mockResolvedValue({
      localModelReady: true,
      reachable: true,
      activeModel: "llama3.1:8b",
      warmingUp: false,
      selectedPrimaryModel: "llama3.1:8b",
      fallbackModels: ["qwen2.5:7b", "gemma3:4b", "llama3.2"],
      autoPull: true,
      lastCheckedAt: "2026-02-11T00:00:00.000Z",
      lastError: null,
    });
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
  });

  describe("generateContent", () => {
    describe("legacy claude backward compatibility", () => {
      it("should remap legacy 'claude' provider to OpenAI", async () => {
        const result = await generateContent("Test prompt", {
          provider: "claude",
        });

        // Claude is remapped to OpenAI, so we get OpenAI response
        expect(result.content).toBe("Mock OpenAI response");
        expect(result.inputTokens).toBe(150);
        expect(result.outputTokens).toBe(250);
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
        ).rejects.toThrow("Local AI is unavailable right now");
      });

      it("should use backend-resolved local model for Ollama", async () => {
        mockGetResolvedLocalModel.mockReturnValue("qwen2.5:7b");
        resetClients();

        await generateContent("Test prompt", { provider: "ollama" });

        expect(mockChatCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: "qwen2.5:7b",
          })
        );
      });

      it("should warm up local model when readiness is false", async () => {
        mockGetOllamaWarmupState.mockReturnValueOnce({
          localModelReady: false,
          reachable: true,
          activeModel: null,
        });
        resetClients();

        await generateContent("Test prompt", { provider: "ollama" });
        expect(mockWarmupLocalModel).toHaveBeenCalledTimes(1);
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

  describe("supportsVision", () => {
    it("should return true for OpenAI", () => {
      expect(supportsVision("openai")).toBe(true);
    });

    it("should return true for premium (maps to OpenAI)", () => {
      expect(supportsVision("premium")).toBe(true);
    });

    it("should return true for legacy claude (maps to OpenAI)", () => {
      expect(supportsVision("claude")).toBe(true);
    });

    it("should return false for Ollama", () => {
      expect(supportsVision("ollama")).toBe(false);
    });

    it("should return false for local (maps to Ollama)", () => {
      expect(supportsVision("local")).toBe(false);
    });
  });

  describe("analyzeImageWithVision", () => {
    const testImage: VisionImage = {
      mediaType: "image/png",
      base64Data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };

    it("should analyze image with OpenAI", async () => {
      const result = await analyzeImageWithVision(
        "Describe this image",
        [testImage],
        { provider: "openai" }
      );

      expect(result.content).toBe("Mock OpenAI response");
      expect(result.inputTokens).toBe(150);
      expect(result.outputTokens).toBe(250);
    });

    it("should analyze image with legacy claude (remaps to OpenAI)", async () => {
      const result = await analyzeImageWithVision(
        "Describe this image",
        [testImage],
        { provider: "claude" }
      );

      // Claude is remapped to OpenAI
      expect(result.content).toBe("Mock OpenAI response");
      expect(result.inputTokens).toBe(150);
      expect(result.outputTokens).toBe(250);
    });

    it("should throw error for Ollama (not supported)", async () => {
      await expect(
        analyzeImageWithVision(
          "Describe this image",
          [testImage],
          { provider: "ollama" }
        )
      ).rejects.toThrow("Vision not supported for provider: ollama");
    });

    it("should handle multiple images", async () => {
      const images: VisionImage[] = [
        { mediaType: "image/png", base64Data: "base64data1" },
        { mediaType: "image/jpeg", base64Data: "base64data2" },
      ];

      const result = await analyzeImageWithVision(
        "Compare these images",
        images,
        { provider: "openai" }
      );

      expect(result.content).toBe("Mock OpenAI response");
    });
  });
});

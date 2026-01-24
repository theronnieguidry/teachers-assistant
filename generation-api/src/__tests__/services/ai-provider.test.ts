import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateContent,
  calculateCredits,
  resetClients,
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

// Mock OpenAI SDK
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "Mock OpenAI response" } }],
          usage: { prompt_tokens: 150, completion_tokens: 250 },
        }),
      },
    },
  })),
}));

describe("AI Provider Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetClients();
    // Set required env vars
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    process.env.OPENAI_API_KEY = "test-openai-key";
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
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

    it("should throw error for unsupported provider", async () => {
      await expect(
        generateContent("Test prompt", { provider: "unknown" as never })
      ).rejects.toThrow("Unsupported AI provider");
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

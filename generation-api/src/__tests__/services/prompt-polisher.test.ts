import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { polishPrompt, type PolishContext } from "../../services/prompt-polisher.js";

describe("Prompt Polisher", () => {
  const baseContext: PolishContext = {
    prompt: "math addition worksheet",
    grade: "2",
    subject: "Math",
    format: "worksheet",
    questionCount: 10,
    difficulty: "medium",
    includeVisuals: true,
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe("polishPrompt", () => {
    it("should return polished prompt when Ollama responds successfully", async () => {
      const polishedText = "Create an engaging math worksheet focused on basic addition with single and double-digit numbers for 2nd graders.";

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: polishedText }),
      } as Response);

      const result = await polishPrompt(baseContext);

      expect(result.polished).toBe(polishedText);
      expect(result.wasPolished).toBe(true);
      expect(result.skipReason).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/generate",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should return original prompt when polishing is disabled", async () => {
      vi.stubEnv("ENABLE_PROMPT_POLISHING", "false");

      const result = await polishPrompt(baseContext);

      expect(result.polished).toBe(baseContext.prompt);
      expect(result.wasPolished).toBe(false);
      expect(result.skipReason).toBe("disabled");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should return original prompt when Ollama is unavailable", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Connection refused"));

      const result = await polishPrompt(baseContext);

      expect(result.polished).toBe(baseContext.prompt);
      expect(result.wasPolished).toBe(false);
      expect(result.skipReason).toBe("ollama_unavailable");
    });

    it("should return original prompt when Ollama returns error status", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await polishPrompt(baseContext);

      expect(result.polished).toBe(baseContext.prompt);
      expect(result.wasPolished).toBe(false);
      expect(result.skipReason).toBe("ollama_error");
    });

    it("should return original prompt when Ollama returns empty response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "" }),
      } as Response);

      const result = await polishPrompt(baseContext);

      expect(result.polished).toBe(baseContext.prompt);
      expect(result.wasPolished).toBe(false);
      expect(result.skipReason).toBe("invalid_response");
    });

    it("should return original prompt when Ollama returns too short response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "OK" }),
      } as Response);

      const result = await polishPrompt(baseContext);

      expect(result.polished).toBe(baseContext.prompt);
      expect(result.wasPolished).toBe(false);
      expect(result.skipReason).toBe("invalid_response");
    });

    it("should skip polishing for already detailed prompts (300+ chars)", async () => {
      const detailedPrompt = "Create a comprehensive math worksheet about addition with two-digit numbers. Include problems that progress from easy to challenging, with word problems that relate to real-world scenarios like shopping and counting money. The worksheet should have visual aids and be appropriate for second grade students who are just learning to add with regrouping. Include at least 15 problems.";

      const result = await polishPrompt({
        ...baseContext,
        prompt: detailedPrompt,
      });

      expect(result.polished).toBe(detailedPrompt);
      expect(result.wasPolished).toBe(false);
      expect(result.skipReason).toBe("already_detailed");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should use custom Ollama URL from environment", async () => {
      vi.stubEnv("OLLAMA_BASE_URL", "http://custom-ollama:11434");

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "Polished prompt here with enough content." }),
      } as Response);

      await polishPrompt(baseContext);

      expect(fetch).toHaveBeenCalledWith(
        "http://custom-ollama:11434/api/generate",
        expect.anything()
      );
    });

    it("should use custom model from POLISH_MODEL env", async () => {
      vi.stubEnv("POLISH_MODEL", "llama3.2:1b");

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "Polished prompt with custom model output." }),
      } as Response);

      await polishPrompt(baseContext);

      const callBody = JSON.parse(
        vi.mocked(fetch).mock.calls[0][1]?.body as string
      );
      expect(callBody.model).toBe("llama3.2:1b");
    });

    it("should include inspiration titles in polishing prompt", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "Polished prompt based on reference materials provided." }),
      } as Response);

      await polishPrompt({
        ...baseContext,
        inspirationTitles: ["Addition Strategies PDF", "Math Games Website"],
      });

      const callBody = JSON.parse(
        vi.mocked(fetch).mock.calls[0][1]?.body as string
      );
      expect(callBody.prompt).toContain("Addition Strategies PDF");
      expect(callBody.prompt).toContain("Math Games Website");
    });

    it("should include grade level in polishing prompt", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: "Grade-appropriate polished prompt here." }),
      } as Response);

      await polishPrompt({
        ...baseContext,
        grade: "K",
      });

      const callBody = JSON.parse(
        vi.mocked(fetch).mock.calls[0][1]?.body as string
      );
      expect(callBody.prompt).toContain("Kindergarten");
    });
  });
});

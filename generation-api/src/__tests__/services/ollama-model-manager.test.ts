import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  warmupLocalModel,
  getOllamaWarmupState,
  getResolvedLocalModel,
  resetOllamaModelManagerForTests,
} from "../../services/ollama-model-manager.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ollama-model-manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOllamaModelManagerForTests();

    process.env.OLLAMA_PRIMARY_MODEL = "llama3.1:8b";
    process.env.OLLAMA_FALLBACK_MODELS = "qwen2.5:7b,gemma3:4b,llama3.2";
    process.env.OLLAMA_AUTO_PULL = "true";
    process.env.OLLAMA_WARMUP_TIMEOUT_MS = "2000";
  });

  afterEach(() => {
    delete process.env.OLLAMA_PRIMARY_MODEL;
    delete process.env.OLLAMA_FALLBACK_MODELS;
    delete process.env.OLLAMA_AUTO_PULL;
    delete process.env.OLLAMA_WARMUP_TIMEOUT_MS;
  });

  it("selects primary model when already installed", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ models: [{ name: "llama3.1:8b" }] }),
    });

    const result = await warmupLocalModel();

    expect(result.localModelReady).toBe(true);
    expect(result.activeModel).toBe("llama3.1:8b");
    expect(result.lastError).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to installed secondary model when primary is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ models: [{ name: "gemma3:4b" }] }),
    });

    const result = await warmupLocalModel();

    expect(result.localModelReady).toBe(true);
    expect(result.activeModel).toBe("gemma3:4b");
  });

  it("pulls and activates the primary model when none are installed", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [{ name: "llama3.1:8b" }] }),
      });

    const result = await warmupLocalModel();

    expect(result.localModelReady).toBe(true);
    expect(result.activeModel).toBe("llama3.1:8b");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/pull"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("does not duplicate warmup execution for concurrent callers", async () => {
    let resolveTags: ((v: unknown) => void) | null = null;
    const delayedTagsPromise = new Promise((resolve) => {
      resolveTags = resolve;
    });

    mockFetch.mockImplementationOnce(() => delayedTagsPromise as unknown as Promise<Response>);

    const first = warmupLocalModel();
    const second = warmupLocalModel();

    expect(mockFetch).toHaveBeenCalledTimes(1);

    resolveTags?.({
      ok: true,
      json: () => Promise.resolve({ models: [{ name: "llama3.1:8b" }] }),
    });

    const [r1, r2] = await Promise.all([first, second]);
    expect(r1.activeModel).toBe("llama3.1:8b");
    expect(r2.activeModel).toBe("llama3.1:8b");
  });

  it("reports unreachable state when Ollama is down", async () => {
    mockFetch.mockRejectedValueOnce(new Error("connection refused"));

    const result = await warmupLocalModel();
    expect(result.localModelReady).toBe(false);
    expect(result.reachable).toBe(false);
    expect(result.activeModel).toBeNull();

    const snapshot = getOllamaWarmupState();
    expect(snapshot.localModelReady).toBe(false);
  });

  it("returns primary model as resolution fallback when warmup has not completed", () => {
    expect(getResolvedLocalModel()).toBe("llama3.1:8b");
  });
});

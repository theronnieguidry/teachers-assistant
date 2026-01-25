import type {
  GenerationRequest,
  GenerationResult,
  GenerationProgress,
  UserCredits,
  Grade,
} from "@/types";
import { TIMEOUTS } from "@/lib/async-utils";

export interface PolishContext {
  prompt: string;
  grade: Grade;
  subject: string;
  format: "worksheet" | "lesson_plan" | "both";
  questionCount: number;
  difficulty: "easy" | "medium" | "hard";
  includeVisuals: boolean;
  inspirationTitles?: string[];
}

export type PolishSkipReason =
  | "disabled"
  | "already_detailed"
  | "ollama_error"
  | "ollama_unavailable"
  | "invalid_response";

export interface PolishResult {
  original: string;
  polished: string;
  wasPolished: boolean;
  skipReason?: PolishSkipReason;
}

const API_BASE_URL = import.meta.env.VITE_GENERATION_API_URL || "http://localhost:3001";

export class GenerationApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "GenerationApiError";
  }
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit,
  accessToken: string,
  timeoutMs: number = TIMEOUTS.FETCH_DEFAULT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new GenerationApiError(
        `Request to ${endpoint} timed out after ${timeoutMs}ms`,
        504
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateTeacherPack(
  request: GenerationRequest,
  accessToken: string,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GenerationResult> {
  console.log("[generation-api] Starting generateTeacherPack for project:", request.projectId);

  // Use longer timeout for streaming requests (5 minutes for initial connection)
  const response = await fetchWithAuth(
    "/generate",
    {
      method: "POST",
      body: JSON.stringify({
        projectId: request.projectId,
        prompt: request.prompt,
        grade: request.grade,
        subject: request.subject,
        options: request.options,
        inspiration: request.inspiration,
        aiProvider: request.aiProvider || "claude",
        aiModel: request.aiModel,
        prePolished: request.prePolished,
      }),
    },
    accessToken,
    TIMEOUTS.STREAMING_TOTAL // Use longer timeout for generation requests
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    if (response.status === 402) {
      throw new GenerationApiError("Insufficient credits", 402, error);
    }

    throw new GenerationApiError(
      error.error || "Generation failed",
      response.status,
      error.details
    );
  }

  // Check if streaming response
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("text/event-stream")) {
    return handleStreamingResponse(response, onProgress);
  }

  const data = await response.json();
  return data.result;
}

async function handleStreamingResponse(
  response: Response,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GenerationResult> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new GenerationApiError("No response body", 500);
  }

  const decoder = new TextDecoder();
  let result: GenerationResult | null = null;

  // Idle timeout - reset every time we receive data
  let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
  // Total timeout - max time for entire stream
  let totalTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let isTimedOut = false;
  let timeoutReason = "";

  const clearTimeouts = () => {
    if (idleTimeoutId) clearTimeout(idleTimeoutId);
    if (totalTimeoutId) clearTimeout(totalTimeoutId);
  };

  const resetIdleTimeout = () => {
    if (idleTimeoutId) clearTimeout(idleTimeoutId);
    idleTimeoutId = setTimeout(() => {
      isTimedOut = true;
      timeoutReason = `No data received for ${TIMEOUTS.STREAMING_IDLE / 1000} seconds`;
      console.error("[generation-api] Idle timeout reached, cancelling stream");
      reader.cancel("Idle timeout").catch(() => {});
    }, TIMEOUTS.STREAMING_IDLE);
  };

  // Set total timeout
  totalTimeoutId = setTimeout(() => {
    isTimedOut = true;
    timeoutReason = `Total streaming time exceeded ${TIMEOUTS.STREAMING_TOTAL / 1000} seconds`;
    console.error("[generation-api] Total timeout reached, cancelling stream");
    reader.cancel("Total timeout").catch(() => {});
  }, TIMEOUTS.STREAMING_TOTAL);

  try {
    console.log("[generation-api] Starting streaming response processing");
    resetIdleTimeout();

    while (true) {
      const { done, value } = await reader.read();

      if (isTimedOut) {
        throw new GenerationApiError(`Streaming timeout: ${timeoutReason}`, 504);
      }

      if (done) {
        console.log("[generation-api] Stream complete (done=true)");
        break;
      }

      // Reset idle timeout on each chunk
      resetIdleTimeout();

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "progress" && onProgress) {
              console.log(`[generation-api] Progress: ${data.progress}% - ${data.message}`);
              onProgress({
                step: data.step,
                progress: data.progress,
                message: data.message,
              });
            } else if (data.type === "complete") {
              console.log("[generation-api] Received complete event");
              result = data.result;
            } else if (data.type === "error") {
              console.error("[generation-api] Stream error:", data.message);
              throw new GenerationApiError(data.message, 500);
            }
          } catch (parseError) {
            if (parseError instanceof GenerationApiError) throw parseError;
            console.warn("[generation-api] Failed to parse SSE line:", line, parseError);
          }
        }
      }
    }
  } finally {
    clearTimeouts();
    reader.releaseLock();
  }

  if (!result) {
    console.error("[generation-api] Stream ended without complete event");
    throw new GenerationApiError("No result received from stream", 500);
  }

  return result;
}

export async function getCredits(accessToken: string): Promise<UserCredits> {
  const response = await fetchWithAuth(
    "/credits",
    { method: "GET" },
    accessToken
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new GenerationApiError(
      error.error || "Failed to fetch credits",
      response.status
    );
  }

  const data = await response.json();
  return data.credits;
}

export async function generatePdf(
  html: string,
  accessToken: string
): Promise<Blob> {
  const response = await fetchWithAuth(
    "/pdf",
    {
      method: "POST",
      body: JSON.stringify({ html }),
    },
    accessToken
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new GenerationApiError(
      error.error || "PDF generation failed",
      response.status
    );
  }

  return response.blob();
}

export async function parseInspiration(
  items: Array<{ id: string; type: string; sourceUrl?: string; content?: string }>,
  accessToken: string
): Promise<Array<{ id: string; extractedContent: string }>> {
  const response = await fetchWithAuth(
    "/inspiration/parse",
    {
      method: "POST",
      body: JSON.stringify({ items }),
    },
    accessToken
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new GenerationApiError(
      error.error || "Inspiration parsing failed",
      response.status
    );
  }

  const data = await response.json();
  return data.results;
}

export async function polishPrompt(
  context: PolishContext,
  accessToken: string
): Promise<PolishResult> {
  const response = await fetchWithAuth(
    "/polish",
    {
      method: "POST",
      body: JSON.stringify(context),
    },
    accessToken
  );

  if (!response.ok) {
    // If polish fails, return original prompt (graceful degradation)
    console.warn("Prompt polishing failed, using original");
    return {
      original: context.prompt,
      polished: context.prompt,
      wasPolished: false,
    };
  }

  const data = await response.json();
  return data;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

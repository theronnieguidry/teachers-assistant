import type {
  GenerationRequest,
  GenerationResult,
  GenerationProgress,
  UserCredits,
} from "@/types";

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
  accessToken: string
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  return response;
}

export async function generateTeacherPack(
  request: GenerationRequest,
  accessToken: string,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GenerationResult> {
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
      }),
    },
    accessToken
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

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));

          if (data.type === "progress" && onProgress) {
            onProgress({
              step: data.step,
              progress: data.progress,
              message: data.message,
            });
          } else if (data.type === "complete") {
            result = data.result;
          } else if (data.type === "error") {
            throw new GenerationApiError(data.message, 500);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!result) {
    throw new GenerationApiError("No result received", 500);
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

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

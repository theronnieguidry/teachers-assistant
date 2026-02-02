import { GenerationApiError } from "./generation-api";
import { TIMEOUTS } from "@/lib/async-utils";

const API_BASE_URL =
  import.meta.env.VITE_GENERATION_API_URL || "http://localhost:3001";

export interface FeedbackRequest {
  type: "bug" | "feature";
  title: string;
  description: string;
  contactEmail?: string;
  appVersion?: string;
}

export interface FeedbackResponse {
  success: boolean;
  issueNumber: number;
  issueUrl: string;
}

/**
 * Submit user feedback to create a GitHub issue
 *
 * @param data - The feedback data
 * @param accessToken - User's authentication token
 * @returns Promise with the created issue details
 */
export async function submitFeedback(
  data: FeedbackRequest,
  accessToken: string
): Promise<FeedbackResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    TIMEOUTS.FETCH_DEFAULT
  );

  try {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new GenerationApiError(
        error.error || "Failed to submit feedback",
        response.status,
        error.details
      );
    }

    const result = await response.json();
    return result as FeedbackResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new GenerationApiError("Request timed out", 504);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

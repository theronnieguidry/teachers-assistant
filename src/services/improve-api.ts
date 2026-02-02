import type { ImprovementType, ImprovementResponse } from "@/types";

const API_BASE_URL = import.meta.env.VITE_GENERATION_API_URL || "http://localhost:3001";

export class ImproveApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ImproveApiError";
  }
}

export interface ImproveRequest {
  projectId: string;
  versionId: string;
  improvementType: ImprovementType;
  targetDocument: "worksheet" | "lesson_plan" | "answer_key";
  additionalInstructions?: string;
}

export interface ImproveEstimate {
  improvementType: ImprovementType;
  creditCost: number;
  description: string;
}

/**
 * Apply an improvement to a document version
 */
export async function applyImprovement(
  request: ImproveRequest,
  accessToken: string
): Promise<ImprovementResponse> {
  const response = await fetch(`${API_BASE_URL}/improve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    if (response.status === 402) {
      throw new ImproveApiError("Insufficient credits", 402, error);
    }

    throw new ImproveApiError(
      error.error || "Improvement failed",
      response.status,
      error.details
    );
  }

  return response.json();
}

/**
 * Get the credit cost for an improvement type
 */
export async function getImprovementEstimate(
  improvementType: ImprovementType,
  accessToken: string
): Promise<ImproveEstimate> {
  const response = await fetch(
    `${API_BASE_URL}/improve/estimate?type=${improvementType}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ImproveApiError(
      error.error || "Failed to get estimate",
      response.status
    );
  }

  return response.json();
}

/**
 * Get all improvement options with their costs
 */
export const IMPROVEMENT_OPTIONS: Array<{
  type: ImprovementType;
  label: string;
  description: string;
  estimatedCredits: number;
}> = [
  {
    type: "fix_confusing",
    label: "Fix Confusing Questions",
    description: "Reword unclear questions to be more understandable",
    estimatedCredits: 1,
  },
  {
    type: "simplify",
    label: "Simplify Content",
    description: "Lower vocabulary level and add more hints",
    estimatedCredits: 2,
  },
  {
    type: "add_questions",
    label: "Add More Questions",
    description: "Add 3-5 more practice questions on the same topic",
    estimatedCredits: 3,
  },
  {
    type: "add_visuals",
    label: "Add More Images",
    description: "Generate and add 2 more relevant images",
    estimatedCredits: 4,
  },
  {
    type: "make_harder",
    label: "Increase Difficulty",
    description: "Make content more challenging",
    estimatedCredits: 2,
  },
  {
    type: "make_easier",
    label: "Decrease Difficulty",
    description: "Simplify content for struggling students",
    estimatedCredits: 2,
  },
];

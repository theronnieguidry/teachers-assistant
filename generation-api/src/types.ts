// Re-export shared types for backward compatibility
export type {
  Grade,
  StudentProfileFlag,
  TeachingConfidence,
  LessonLength,
  ProjectOptions,
  InspirationItem,
  DesignPackContext,
  LessonMetadata,
  GenerationProgress,
  GenerationResult,
  ImageStats,
} from "@shared/types";

// Import shared types used by local interfaces below
import type { Grade, ProjectOptions, InspirationItem, DesignPackContext, ImageStats } from "@shared/types";

// User-facing provider types + legacy internal types for backward compatibility
export type AIProvider = "premium" | "local" | "claude" | "openai" | "ollama";
// Internal provider types used for actual API calls (Claude removed - now OpenAI only for premium)
export type InternalAIProvider = "openai" | "ollama";
export type GenerationStep = "worksheet" | "lesson_plan" | "answer_key" | "complete";

export interface GenerationRequest {
  projectId: string;
  prompt: string;
  grade: Grade;
  subject: string;
  options: ProjectOptions;
  inspiration?: InspirationItem[];
  inspirationIds?: string[];
  objectiveId?: string | null;
  designPackContext?: DesignPackContext;
  aiProvider?: AIProvider;
  prePolished?: boolean;
}

export interface AuthenticatedRequest {
  userId: string;
  email: string;
}

export interface CreditsInfo {
  balance: number;
  lifetimeGranted: number;
  lifetimeUsed: number;
}

export interface ParsedInspiration {
  id: string;
  type: "url" | "pdf" | "image" | "text";
  title: string;
  extractedContent: string;
}

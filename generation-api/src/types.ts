export type Grade = "K" | "1" | "2" | "3" | "4" | "5" | "6";
export type AIProvider = "claude" | "openai" | "ollama";
export type GenerationStep = "worksheet" | "lesson_plan" | "answer_key" | "complete";

export interface InspirationItem {
  id: string;
  type: "url" | "pdf" | "image" | "text";
  title: string;
  sourceUrl?: string;
  content?: string;
  storagePath?: string;
}

export interface ProjectOptions {
  questionCount?: number;
  includeVisuals?: boolean;
  difficulty?: "easy" | "medium" | "hard";
  format?: "worksheet" | "lesson_plan" | "both";
  includeAnswerKey?: boolean;
}

export interface GenerationRequest {
  projectId: string;
  prompt: string;
  grade: Grade;
  subject: string;
  options: ProjectOptions;
  inspiration?: InspirationItem[]; // Legacy: embedded items
  inspirationIds?: string[]; // New: IDs of persisted items to fetch
  aiProvider?: AIProvider;
  prePolished?: boolean; // Skip prompt polishing if already done client-side
}

export interface GenerationProgress {
  step: GenerationStep;
  progress: number;
  message: string;
}

export interface GenerationResult {
  projectId: string;
  versionId: string;
  worksheetHtml: string;
  lessonPlanHtml: string;
  answerKeyHtml: string;
  creditsUsed: number;
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

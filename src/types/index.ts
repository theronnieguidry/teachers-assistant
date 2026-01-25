export * from "./database";

// Project-related types
export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  prompt: string;
  grade: Grade;
  subject: string;
  options: ProjectOptions;
  inspiration: InspirationItem[];
  outputPath: string | null;
  status: ProjectStatus;
  errorMessage: string | null;
  creditsUsed: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  // Latest version content (optional, loaded separately)
  latestVersion?: ProjectVersion;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  worksheetHtml: string | null;
  lessonPlanHtml: string | null;
  answerKeyHtml: string | null;
  aiProvider: string | null;
  aiModel: string | null;
  createdAt: Date;
}

export interface ProjectOptions {
  questionCount?: number;
  includeVisuals?: boolean;
  difficulty?: "easy" | "medium" | "hard";
  format?: "worksheet" | "lesson_plan" | "both";
  includeAnswerKey?: boolean;
}

export interface InspirationItem {
  id: string;
  userId?: string; // For persisted items in library
  type: "url" | "pdf" | "image" | "text";
  title: string;
  sourceUrl?: string;
  content?: string;
  storagePath?: string;
  createdAt?: Date; // For persisted items
}

// Generation-related types
export interface GenerationRequest {
  projectId: string;
  prompt: string;
  grade: Grade;
  subject: string;
  options: ProjectOptions;
  inspiration: InspirationItem[];
  aiProvider?: "claude" | "openai" | "ollama";
  aiModel?: string;
  prePolished?: boolean; // Skip prompt polishing if already done client-side
}

export interface GenerationProgress {
  step: "worksheet" | "lesson_plan" | "answer_key" | "complete";
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

// User-related types
export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface UserCredits {
  balance: number;
  lifetimeGranted: number;
  lifetimeUsed: number;
}

// Import Grade and ProjectStatus from database types
import type { Grade, ProjectStatus } from "./database";

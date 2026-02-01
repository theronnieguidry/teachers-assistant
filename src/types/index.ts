export * from "./database";
export * from "./learner";
export * from "./artifacts";

// Re-export shared types (single source of truth with generation-api)
// Note: Grade comes through ./database, curriculum types through ./learner
export type {
  StudentProfileFlag,
  TeachingConfidence,
  LessonLength,
  LessonMetadata,
  GenerationMode,
  VisualRichness,
  VisualStyle,
  VisualSettings,
  ImageStats,
  ProjectOptions,
  InspirationItem,
  GenerationProgress,
  GenerationResult,
  EstimateRequest,
  EstimateResponse,
  ImprovementType,
  TargetDocument,
  ImprovementRequest,
  ImprovementResponse,
  ObjectiveRecommendation,
} from "@shared/types";
export { DEFAULT_VISUAL_SETTINGS } from "@shared/types";

// Import shared types used by local interfaces below
import type {
  ProjectOptions,
  InspirationItem,
  LessonMetadata,
  GenerationMode,
  VisualSettings,
} from "@shared/types";
import type { Grade, ProjectStatus } from "./database";

// ============================================
// Project Types (frontend-specific)
// ============================================

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
  latestVersion?: ProjectVersion;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  worksheetHtml: string | null;
  lessonPlanHtml: string | null;
  answerKeyHtml: string | null;
  teacherScriptHtml: string | null;
  studentActivityHtml: string | null;
  materialsListHtml: string | null;
  lessonMetadata: LessonMetadata | null;
  aiProvider: string | null;
  aiModel: string | null;
  createdAt: Date;
}

// ============================================
// Generation Request (frontend-specific)
// ============================================

export interface GenerationRequest {
  projectId: string;
  prompt: string;
  grade: Grade;
  subject: string;
  options: ProjectOptions;
  inspiration: InspirationItem[];
  aiProvider?: "premium" | "local" | "claude" | "openai" | "ollama";
  aiModel?: string;
  prePolished?: boolean;
  generationMode?: GenerationMode;
  visualSettings?: VisualSettings;
}

// ============================================
// User Types (frontend-specific)
// ============================================

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

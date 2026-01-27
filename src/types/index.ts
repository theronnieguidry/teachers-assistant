export * from "./database";
export * from "./learner";
export * from "./artifacts";

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
  // New lesson plan artifacts (Issue #17)
  teacherScriptHtml: string | null;
  studentActivityHtml: string | null;
  materialsListHtml: string | null;
  lessonMetadata: LessonMetadata | null;
  aiProvider: string | null;
  aiModel: string | null;
  createdAt: Date;
}

// ============================================
// Lesson Plan Types (Issue #17)
// ============================================

export type StudentProfileFlag =
  | "needs_movement"
  | "struggles_reading"
  | "easily_frustrated"
  | "advanced"
  | "ell";

export type TeachingConfidence = "novice" | "intermediate" | "experienced";

export type LessonLength = 15 | 30 | 45 | 60;

export interface LessonMetadata {
  objective: string;
  lessonLength: LessonLength;
  teachingConfidence: TeachingConfidence;
  studentProfile: StudentProfileFlag[];
  sectionsGenerated: string[];
}

// Curriculum Pack Types (for "Help Me Choose" feature)
export interface ObjectiveRecommendation {
  id: string;
  text: string;
  difficulty: "easy" | "standard" | "challenge";
  estimatedMinutes: number;
  unitTitle: string;
  whyRecommended: string;
  vocabulary?: string[];
  activities?: string[];
  misconceptions?: string[];
}

export interface ProjectOptions {
  questionCount?: number;
  includeVisuals?: boolean;
  difficulty?: "easy" | "medium" | "hard";
  format?: "worksheet" | "lesson_plan" | "both";
  includeAnswerKey?: boolean;
  // Lesson plan specific options (Issue #17)
  lessonLength?: LessonLength;
  studentProfile?: StudentProfileFlag[];
  teachingConfidence?: TeachingConfidence;
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
  // User-facing (premium, local) and legacy (claude, openai, ollama) provider types
  aiProvider?: "premium" | "local" | "claude" | "openai" | "ollama";
  aiModel?: string;
  prePolished?: boolean; // Skip prompt polishing if already done client-side
  // Premium pipeline parameters
  generationMode?: GenerationMode;
  visualSettings?: VisualSettings;
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
  // New lesson plan artifacts (Issue #17)
  teacherScriptHtml?: string;
  studentActivityHtml?: string;
  materialsListHtml?: string;
  lessonMetadata?: LessonMetadata;
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

// ============================================
// Premium Pipeline Types
// ============================================

export type GenerationMode = "standard" | "premium_plan_pipeline" | "premium_lesson_plan_pipeline";
export type VisualRichness = "minimal" | "standard" | "rich";
export type VisualStyle = "friendly_cartoon" | "simple_icons" | "black_white";

export interface VisualSettings {
  includeVisuals: boolean;
  richness: VisualRichness;
  style: VisualStyle;
  theme?: string;
}

export const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
  includeVisuals: true,
  richness: "minimal",
  style: "friendly_cartoon",
};

export interface EstimateRequest {
  grade: Grade;
  subject: string;
  options: ProjectOptions;
  visualSettings?: VisualSettings;
  generationMode?: GenerationMode;
}

export interface EstimateResponse {
  estimate: {
    minCredits: number;
    maxCredits: number;
    expectedCredits: number;
    breakdown?: {
      textGeneration: number;
      imageGeneration: number;
      qualityGate: number;
    };
  };
  disclaimer: string;
}

export type ImprovementType =
  | "fix_confusing"
  | "simplify"
  | "add_questions"
  | "add_visuals"
  | "make_harder"
  | "make_easier";

export interface ImprovementRequest {
  projectId: string;
  versionId: string;
  improvementType: ImprovementType;
  targetDocument: "worksheet" | "lesson_plan" | "answer_key";
  additionalInstructions?: string;
}

export interface ImprovementResponse {
  newVersionId: string;
  creditsUsed: number;
  changes: string[];
}

/**
 * Shared types between frontend (React/Vite) and generation-api (Node/Express).
 *
 * This is the single source of truth for types used by both packages.
 * Each package re-exports these types from its own barrel file so that
 * existing consumer imports remain unchanged.
 */

// ============================================
// Grade
// ============================================

export type Grade = "K" | "1" | "2" | "3" | "4" | "5" | "6";

// ============================================
// Lesson Plan Types
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

// ============================================
// Generation Mode
// ============================================

export type GenerationMode = "standard" | "premium_plan_pipeline" | "premium_lesson_plan_pipeline";

// ============================================
// Visual Settings
// ============================================

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

// ============================================
// Project Options
// ============================================

export interface ProjectOptions {
  questionCount?: number;
  includeVisuals?: boolean;
  difficulty?: "easy" | "medium" | "hard";
  format?: "worksheet" | "lesson_plan" | "both";
  includeAnswerKey?: boolean;
  lessonLength?: LessonLength;
  studentProfile?: StudentProfileFlag[];
  teachingConfidence?: TeachingConfidence;
}

// ============================================
// Inspiration Item
// ============================================

export interface InspirationItem {
  id: string;
  userId?: string;
  type: "url" | "pdf" | "image" | "text";
  title: string;
  sourceUrl?: string;
  content?: string;
  storagePath?: string;
  createdAt?: Date;
}

// ============================================
// Image Stats
// ============================================

export interface ImageStats {
  total: number;
  generated: number;
  cached: number;
  failed: number;
  relevance?: {
    total: number;
    accepted: number;
    rejected: number;
    cap: number;
    byPurpose: Record<string, number>;
  } | null;
}

// ============================================
// Generation Progress & Result
// ============================================

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
  teacherScriptHtml?: string;
  studentActivityHtml?: string;
  materialsListHtml?: string;
  lessonMetadata?: LessonMetadata;
  creditsUsed: number;
  imageStats?: ImageStats;
}

// ============================================
// Estimate Types
// ============================================

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

// ============================================
// Improvement Types
// ============================================

export type ImprovementType =
  | "fix_confusing"
  | "simplify"
  | "add_questions"
  | "add_visuals"
  | "make_harder"
  | "make_easier";

export type TargetDocument = "worksheet" | "lesson_plan" | "answer_key";

export interface ImprovementRequest {
  projectId: string;
  versionId: string;
  improvementType: ImprovementType;
  targetDocument: TargetDocument;
  additionalInstructions?: string;
}

export interface ImprovementResponse {
  newVersionId: string;
  creditsUsed: number;
  changes: string[];
}

// ============================================
// Curriculum Pack Types
// ============================================

export interface CurriculumObjective {
  id: string;
  text: string;
  prereqs: string[];
  difficulty: "easy" | "standard" | "challenge";
  estimatedMinutes: number;
  misconceptions: string[];
  vocabulary: string[];
  activities: string[];
}

export interface CurriculumUnit {
  unitId: string;
  title: string;
  grade: Grade;
  sequence: number;
  objectives: CurriculumObjective[];
}

export interface CurriculumPack {
  subject: string;
  gradeRange: string;
  version: string;
  units: CurriculumUnit[];
}

// ============================================
// Objective Recommendation
// ============================================

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

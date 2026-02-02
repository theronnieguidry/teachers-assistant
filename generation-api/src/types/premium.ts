/**
 * Premium Pipeline Types
 *
 * These types define the structured data contracts for the premium worksheet
 * generation pipeline: Plan → Validate → Assemble → Image → Quality Gate
 */

import { Grade, ProjectOptions } from "../types.js";

// Re-export Grade for convenience
export type { Grade } from "../types.js";

// Import shared types for local use in this file
import type {
  VisualRichness,
  VisualStyle,
  VisualSettings,
  LessonLength,
  StudentProfileFlag,
  TeachingConfidence,
  LessonMetadata,
  CurriculumObjective,
  CurriculumUnit,
} from "@shared/types";

// Re-export shared types for backward compatibility
// (many files import these from ../types/premium.js)
export type {
  GenerationMode,
  VisualRichness,
  VisualStyle,
  VisualSettings,
  ImageStats,
  EstimateRequest,
  EstimateResponse,
  ImprovementType,
  TargetDocument,
  ImprovementRequest,
  ImprovementResponse,
  StudentProfileFlag,
  TeachingConfidence,
  LessonLength,
  LessonMetadata,
  CurriculumPack,
  CurriculumUnit,
  CurriculumObjective,
  ObjectiveRecommendation,
} from "@shared/types";

// DEFAULT_VISUAL_SETTINGS stays local (value import can't resolve @shared/types at runtime)
export const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
  includeVisuals: true,
  richness: "minimal",
  style: "friendly_cartoon",
};

// ============================================
// Worksheet Plan (Output of Planner)
// ============================================

export interface WorksheetPlan {
  version: "1.0";
  metadata: WorksheetMetadata;
  structure: WorksheetStructure;
  style: WorksheetStyle;
  visualPlacements?: ImagePlacement[];
}

export interface WorksheetMetadata {
  title: string;
  grade: Grade;
  subject: string;
  topic: string;
  learningObjectives: string[];
  estimatedTime: string;
}

export interface WorksheetStructure {
  header: WorksheetHeader;
  sections: WorksheetSection[];
}

export interface WorksheetHeader {
  title: string;
  hasNameLine: boolean;
  hasDateLine: boolean;
  instructions: string;
}

export interface WorksheetSection {
  id: string;
  type: SectionType;
  title?: string;
  instructions?: string;
  items: WorksheetItem[];
}

export type SectionType =
  | "questions"
  | "matching"
  | "fill_blank"
  | "word_bank"
  | "drawing"
  | "short_answer"
  | "true_false"
  | "multiple_choice";

export interface WorksheetItem {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  points?: number;
}

export type QuestionType =
  | "multiple_choice"
  | "fill_blank"
  | "short_answer"
  | "matching"
  | "true_false"
  | "word_problem"
  | "drawing";

export interface WorksheetStyle {
  difficulty: "easy" | "medium" | "hard";
  visualStyle: VisualRichness;
  theme?: string;
}

// ============================================
// Image Generation
// ============================================

export type ImagePurpose =
  | "counting_support"
  | "phonics_cue"
  | "shape_diagram"
  | "word_problem_context"
  | "science_diagram_simple"
  | "matching_support"
  | "diagram"
  | "illustration"
  | "decoration";

export interface ImagePlacement {
  afterItemId: string;
  description: string;
  purpose: ImagePurpose;
  size: "small" | "medium" | "wide";
  style?: VisualStyle;
}

export interface ImageRequest {
  prompt: string;
  style: VisualStyle;
  size: "small" | "medium" | "wide";
  placementId?: string;
}

export interface ImageResult {
  base64Data: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  placementId?: string;
}

// ============================================
// Image Provider Abstraction (Issue #26)
// ============================================

export interface ImageProviderResult {
  base64Data: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
}

export interface ImageProviderConfig {
  provider: string;
  model?: string;
}

export interface ImageProvider {
  readonly name: string;

  getSizeMapping(logicalSize: string): {
    nativeSize: string;
    target: { width: number; height: number };
  };

  generateImage(
    prompt: string,
    logicalSize: string,
    style: VisualStyle
  ): Promise<ImageProviderResult>;

  isAvailable(): boolean;

  isContentPolicyError(error: unknown): boolean;
}

// ============================================
// Validation
// ============================================

export interface PlanValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  autoRepairable: boolean;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationRequirements {
  minQuestions: number;
  maxQuestions: number;
  grade: Grade;
  subject: string;
  requireAnswers: boolean;
}

// ============================================
// Quality Gate
// ============================================

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: QualityIssue[];
  shouldCharge: boolean;
}

export interface QualityIssue {
  category:
    | "html_structure"
    | "question_count"
    | "content_quality"
    | "print_friendly"
    | "answer_key"
    | "image_count"
    | "image_size"
    | "image_missing";
  severity: "error" | "warning";
  message: string;
}

export interface QualityRequirements {
  expectedQuestionCount: number;
  requireAnswerKey: boolean;
  requirePrintFriendly: boolean;
  expectedImageCount?: number;
  maxTotalImageSize?: number;
  visualRichness?: VisualRichness;
}

// ============================================
// Improvement Result (backend-specific)
// ============================================

export interface ImprovementResult {
  improvedHtml: string;
  changes: string[];
  creditsUsed: number;
}

// ============================================
// Premium Generation Context
// ============================================

export interface PremiumGenerationContext {
  projectId: string;
  userId: string;
  prompt: string;
  grade: Grade;
  subject: string;
  options: ProjectOptions;
  visualSettings: VisualSettings;
  inspiration?: {
    designItems: string[];
    contentItems: string[];
  };
}

// ============================================
// Premium Pipeline Progress
// ============================================

export type PremiumPipelineStep =
  | "planning"
  | "validating"
  | "assembling"
  | "images"
  | "quality"
  | "complete";

export interface PremiumPipelineProgress {
  step: PremiumPipelineStep;
  progress: number;
  message: string;
  substep?: string;
}

// ============================================
// Lesson Plan Types (Issue #17)
// ============================================

export type LessonSectionType =
  | "warmup"
  | "instruction"
  | "guided_practice"
  | "independent_practice"
  | "check_understanding"
  | "closure"
  | "extension";

export interface LessonPlanStructure {
  version: "1.0";
  metadata: LessonPlanMetadata;
  sections: LessonSection[];
  materials: MaterialItem[];
  differentiation: DifferentiationOptions;
  accommodations: string[];
}

export interface LessonPlanMetadata {
  objective: string;
  grade: Grade;
  subject: string;
  durationMinutes: LessonLength;
  priorKnowledge: string[];
  successCriteria: string;
}

export interface LessonSection {
  type: LessonSectionType;
  title: string;
  durationMinutes: number;
  description: string;
  teacherScript?: TeacherScriptEntry[];
  activities: string[];
  tips?: string[];
}

export interface TeacherScriptEntry {
  action: "say" | "do" | "if_struggle" | "if_success";
  text: string;
}

export interface MaterialItem {
  name: string;
  quantity?: string;
  optional: boolean;
  notes?: string;
}

export interface DifferentiationOptions {
  forStruggling: string[];
  forAdvanced: string[];
  forELL: string[];
}

export interface LessonPlanOutputs {
  lessonPlanHtml: string;
  teacherScriptHtml: string | null;
  materialsListHtml: string;
  studentActivityHtml: string | null;
  lessonMetadata: LessonMetadata;
}

export interface LessonPlanValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  autoRepairable: boolean;
  repairedPlan?: LessonPlanStructure;
}

export interface LessonPlanRequirements {
  lessonLength: LessonLength;
  grade: Grade;
  subject: string;
  teachingConfidence: TeachingConfidence;
  studentProfile: StudentProfileFlag[];
  includeTeacherScript: boolean;
}

export interface LessonPlanContext extends PremiumGenerationContext {
  lessonLength: LessonLength;
  teachingConfidence: TeachingConfidence;
  studentProfile: StudentProfileFlag[];
  objective?: string;
}

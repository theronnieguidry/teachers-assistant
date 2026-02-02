/**
 * Module declaration for @shared/types.
 * This allows the generation-api to use `import type { ... } from "@shared/types"`
 * with NodeNext module resolution. Since all imports from shared are type-only,
 * they are erased at runtime and don't need actual module resolution.
 */
declare module "@shared/types" {
  export type Grade = "K" | "1" | "2" | "3" | "4" | "5" | "6";

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

  export type GenerationMode = "standard" | "premium_plan_pipeline" | "premium_lesson_plan_pipeline";

  export type VisualRichness = "minimal" | "standard" | "rich";
  export type VisualStyle = "friendly_cartoon" | "simple_icons" | "black_white";

  export interface VisualSettings {
    includeVisuals: boolean;
    richness: VisualRichness;
    style: VisualStyle;
    theme?: string;
  }

  export const DEFAULT_VISUAL_SETTINGS: VisualSettings;

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
}

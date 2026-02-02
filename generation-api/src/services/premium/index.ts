/**
 * Premium Services - Barrel Export
 *
 * Exports all premium pipeline services for the structured generation workflow:
 * Plan → Validate → Assemble → Image → Quality Gate
 */

// Worksheet Planner
export {
  createWorksheetPlan,
  createFallbackPlan,
  countQuestions,
  type PlannerResult,
} from "./worksheet-planner.js";

// Worksheet Validator
export {
  validatePlan,
  attemptRepair,
  validateAndRepair,
} from "./worksheet-validator.js";

// HTML Assembler
export {
  assembleWorksheet,
  assembleAnswerKey,
  assembleLessonPlan,
  assembleAll,
  type AssemblyResult,
} from "./html-assembler.js";

// Quality Gate
export {
  runQualityGate,
  getQualitySummary,
} from "./quality-gate.js";

// Image Generator
export {
  generateImage,
  generateBatchImages,
  createImageRequestsFromPlacements,
  estimateImageCredits,
  isImageGenerationAvailable,
  resetImageClient,
} from "./image-generator.js";

// Image Providers
export { OpenAIImageProvider } from "./providers/openai-image-provider.js";

// Image Relevance Gate
export {
  filterAndCapPlacements,
  checkRelevance,
  getCap,
  validatePlacementCount,
  getFilterSummary,
  ALLOWED_PURPOSES,
  RICHNESS_CAPS,
  MAX_RICH_IMAGES,
} from "./image-relevance-gate.js";

// Improvement Service
export {
  ImprovementService,
  improvementService,
} from "./improvement-service.js";

// Re-export premium types for convenience
export type {
  WorksheetPlan,
  WorksheetMetadata,
  WorksheetStructure,
  WorksheetSection,
  WorksheetItem,
  WorksheetHeader,
  WorksheetStyle,
  SectionType,
  QuestionType,
  GenerationMode,
  VisualSettings,
  VisualRichness,
  VisualStyle,
  ImagePlacement,
  ImageProvider,
  ImageProviderResult,
  ImageProviderConfig,
  ImageRequest,
  ImageResult,
  PlanValidationResult,
  ValidationIssue,
  ValidationRequirements,
  QualityCheckResult,
  QualityIssue,
  QualityRequirements,
  EstimateRequest,
  EstimateResponse,
  ImprovementType,
  ImprovementRequest,
  ImprovementResponse,
  ImprovementResult,
  PremiumGenerationContext,
  PremiumPipelineStep,
  PremiumPipelineProgress,
} from "../../types/premium.js";

export { DEFAULT_VISUAL_SETTINGS } from "../../types/premium.js";

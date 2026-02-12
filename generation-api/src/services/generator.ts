import type {
  GenerationRequest,
  GenerationResult,
  GenerationProgress,
  AIProvider,
  ParsedInspiration,
} from "../types.js";
import {
  generateContent,
  calculateCredits,
  requiresCredits,
  type AIProviderConfig,
} from "./ai-provider.js";
import {
  buildWorksheetPrompt,
  buildLessonPlanPrompt,
  buildAnswerKeyPrompt,
} from "../prompts/templates.js";
import { parseAllInspiration } from "./inspiration-parser.js";
import { getSupabaseClient, reserveCredits, refundCredits } from "./credits.js";
import { processVisualPlaceholders } from "./image-service.js";
import { polishPrompt } from "./prompt-polisher.js";
import type {
  GenerationMode,
  VisualSettings,
  PremiumGenerationContext,
  QualityRequirements,
  ValidationRequirements,
  ImageStats,
} from "../types/premium.js";
import { DEFAULT_VISUAL_SETTINGS } from "../types/premium.js";
import {
  createWorksheetPlan,
  createFallbackPlan,
  countQuestions,
  validateAndRepair,
  assembleAll,
  runQualityGate,
  getQualitySummary,
} from "./premium/index.js";
import {
  generateBatchImagesWithStats,
  createImageRequestsFromPlacements,
  isImageGenerationAvailable,
} from "./premium/image-generator.js";
import { filterAndCapPlacements, getFilterSummary } from "./premium/image-relevance-gate.js";
import { compressImages, validateOutputSize, getCompressionStats } from "./premium/image-compressor.js";
import type { ImageResult } from "../types/premium.js";
import {
  createLessonPlan,
} from "./premium/lesson-plan-planner.js";
import {
  validateAndRepairLessonPlan,
  type LessonPlanRequirements,
} from "./premium/lesson-plan-validator.js";
import {
  assembleLessonPlanHTML,
} from "./premium/lesson-plan-assembler.js";
import type {
  LessonPlanStructure,
  StudentProfileFlag,
  TeachingConfidence,
  LessonLength,
} from "../types/premium.js";
import type { QualityIssue } from "../types/premium.js";

const ESTIMATED_CREDITS = 5; // Conservative estimate for reservation
const PREMIUM_ESTIMATED_CREDITS = 7; // Higher estimate for premium pipeline
const PREMIUM_LESSON_PLAN_CREDITS = 8; // Estimate for lesson plan pipeline (includes teacher script)

interface TeacherSafeQualityReportIssue {
  category: string;
  message: string;
}

interface TeacherSafeQualityReport {
  score: number;
  threshold: number;
  summary: string;
  issues: TeacherSafeQualityReportIssue[];
  retrySuggestion: string;
}

function toTeacherSafeCategory(category: string): string {
  switch (category) {
    case "question_count":
      return "Question coverage";
    case "answer_key":
      return "Answer key";
    case "content_quality":
      return "Content clarity";
    case "print_friendly":
      return "Print readiness";
    case "html_structure":
      return "Formatting";
    case "image_count":
    case "image_size":
    case "image_missing":
      return "Visuals";
    default:
      return "Content";
  }
}

function createQualityGateFailureError(
  score: number,
  threshold: number,
  issues: QualityIssue[]
): Error {
  const teacherSafeIssues = issues
    .filter((issue) => issue.severity === "error" || issue.severity === "warning")
    .slice(0, 5)
    .map((issue) => ({
      category: toTeacherSafeCategory(issue.category),
      message: issue.message,
    }));

  const qualityReport: TeacherSafeQualityReport = {
    score,
    threshold,
    summary:
      "The generated result did not meet our classroom quality checks, so credits were automatically refunded.",
    issues: teacherSafeIssues,
    retrySuggestion:
      "Try simplifying the request, reducing visuals, or lowering complexity, then run generation again.",
  };

  const qualityError = new Error(`Quality check failed (score: ${score}/${threshold}). Please try again.`) as Error & {
    code: string;
    statusCode: number;
    qualityReport: TeacherSafeQualityReport;
  };
  qualityError.code = "quality_gate_failed";
  qualityError.statusCode = 422;
  qualityError.qualityReport = qualityReport;
  return qualityError;
}

function createLessonPlanQualityFailureError(
  score: number,
  threshold: number,
  issues: string[]
): Error {
  const qualityReport: TeacherSafeQualityReport = {
    score,
    threshold,
    summary:
      "The lesson output did not meet our quality checks, so credits were automatically refunded.",
    issues: issues.slice(0, 5).map((message) => ({
      category: "Lesson quality",
      message,
    })),
    retrySuggestion:
      "Try shortening the prompt or reducing scope (fewer sections/activities), then retry generation.",
  };

  const qualityError = new Error(`Quality check failed (score: ${score}/${threshold}). Please try again.`) as Error & {
    code: string;
    statusCode: number;
    qualityReport: TeacherSafeQualityReport;
  };
  qualityError.code = "quality_gate_failed";
  qualityError.statusCode = 422;
  qualityError.qualityReport = qualityReport;
  return qualityError;
}

export type ProgressCallback = (progress: GenerationProgress) => void;

export interface GeneratorConfig {
  aiProvider: AIProvider;
  model?: string;
  generationMode?: GenerationMode;
  visualSettings?: VisualSettings;
}

export async function generateTeacherPack(
  request: GenerationRequest,
  userId: string,
  config: GeneratorConfig,
  onProgress?: ProgressCallback
): Promise<GenerationResult> {
  const startTime = Date.now();
  const generationMode = config.generationMode || "standard";

  console.log(`[generator] Starting generation for project ${request.projectId}`);
  console.log(`[generator] User: ${userId}, Provider: ${config.aiProvider}, Model: ${config.model || "default"}`);
  console.log(`[generator] Mode: ${generationMode}, Inspiration items: ${request.inspiration?.length || 0}, Pre-polished: ${request.prePolished}`);

  // Route to premium pipeline if requested
  if (generationMode === "premium_plan_pipeline") {
    return generatePremiumTeacherPack(request, userId, config, onProgress);
  }

  // Route to premium lesson plan pipeline if requested
  if (generationMode === "premium_lesson_plan_pipeline") {
    return generatePremiumLessonPlan(request, userId, config, onProgress);
  }

  // Continue with standard pipeline
  console.log(`[generator] Using standard pipeline`);

  const aiConfig: AIProviderConfig = {
    provider: config.aiProvider,
    model: config.model,
    maxTokens: 8192,
  };

  // Local AI (Ollama) is free - skip credit reservation
  const needsCredits = requiresCredits(config.aiProvider);

  // Reserve credits first (skip for Local AI)
  if (needsCredits) {
    console.log(`[generator] Reserving ${ESTIMATED_CREDITS} credits...`);
    const reserved = await reserveCredits(userId, ESTIMATED_CREDITS, request.projectId);
    if (!reserved) {
      console.error("[generator] Failed to reserve credits - insufficient balance");
      throw new Error("Insufficient credits");
    }
    console.log("[generator] Credits reserved successfully");
  } else {
    console.log("[generator] Using Local AI (free) - skipping credit reservation");
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    // Update project status to generating
    console.log("[generator] Updating project status to 'generating'...");
    const supabase = getSupabaseClient();
    await supabase
      .from("projects")
      .update({ status: "generating" })
      .eq("id", request.projectId);
    console.log("[generator] Project status updated");

    // Parse inspiration materials
    console.log(`[generator] Processing ${request.inspiration.length} inspiration materials...`);
    onProgress?.({
      step: "worksheet",
      progress: 5,
      message: "Processing inspiration materials...",
    });

    let parsedInspiration: ParsedInspiration[] = [];
    if (request.inspiration.length > 0) {
      parsedInspiration = await parseAllInspiration(request.inspiration, aiConfig);
      console.log(`[generator] Parsed ${parsedInspiration.length} inspiration items`);
    }

    // Polish the user's prompt using Ollama (free, runs locally)
    // Skip if already polished client-side
    let polishedPrompt = request.prompt;
    if (!request.prePolished) {
      console.log("[generator] Polishing prompt...");
      onProgress?.({
        step: "worksheet",
        progress: 10,
        message: "Refining your request...",
      });

      const polishResult = await polishPrompt({
        prompt: request.prompt,
        grade: request.grade,
        subject: request.subject,
        format: request.options.format || "both",
        questionCount: request.options.questionCount || 10,
        difficulty: request.options.difficulty || "medium",
        includeVisuals: request.options.includeVisuals ?? true,
        inspirationTitles: parsedInspiration.map((i) => i.title),
      });
      polishedPrompt = polishResult.polished;
      console.log(`[generator] Prompt polished: ${polishResult.wasPolished ? "yes" : "no (skipped)"}`);
    } else {
      console.log("[generator] Prompt already polished client-side, skipping");
    }

    const promptContext = {
      prompt: polishedPrompt,
      grade: request.grade,
      subject: request.subject,
      options: request.options,
      inspiration: parsedInspiration,
    };

    // Generate worksheet
    console.log("[generator] Generating worksheet...");
    onProgress?.({
      step: "worksheet",
      progress: 20,
      message: "Generating worksheet...",
    });

    const worksheetPrompt = buildWorksheetPrompt(promptContext);
    const worksheetResponse = await generateContent(worksheetPrompt, aiConfig);
    const worksheetRawHtml = extractHtml(worksheetResponse.content);
    console.log(`[generator] Worksheet generated: ${worksheetResponse.inputTokens} input, ${worksheetResponse.outputTokens} output tokens`);

    onProgress?.({
      step: "worksheet",
      progress: 35,
      message: "Adding images to worksheet...",
    });
    const worksheetHtml = await processVisualPlaceholders(worksheetRawHtml);
    console.log("[generator] Worksheet images processed");

    totalInputTokens += worksheetResponse.inputTokens;
    totalOutputTokens += worksheetResponse.outputTokens;

    // Generate lesson plan if requested
    let lessonPlanHtml = "";
    if (
      request.options.format === "lesson_plan" ||
      request.options.format === "both"
    ) {
      console.log("[generator] Generating lesson plan...");
      onProgress?.({
        step: "lesson_plan",
        progress: 50,
        message: "Generating lesson plan...",
      });

      const lessonPlanPrompt = buildLessonPlanPrompt(promptContext);
      const lessonPlanResponse = await generateContent(lessonPlanPrompt, aiConfig);
      const lessonPlanRawHtml = extractHtml(lessonPlanResponse.content);
      console.log(`[generator] Lesson plan generated: ${lessonPlanResponse.inputTokens} input, ${lessonPlanResponse.outputTokens} output tokens`);

      onProgress?.({
        step: "lesson_plan",
        progress: 60,
        message: "Adding images to lesson plan...",
      });
      lessonPlanHtml = await processVisualPlaceholders(lessonPlanRawHtml);
      console.log("[generator] Lesson plan images processed");

      totalInputTokens += lessonPlanResponse.inputTokens;
      totalOutputTokens += lessonPlanResponse.outputTokens;
    } else {
      console.log("[generator] Skipping lesson plan (not requested)");
    }

    // Generate answer key if requested
    let answerKeyHtml = "";
    if (request.options.includeAnswerKey !== false) {
      console.log("[generator] Generating answer key...");
      onProgress?.({
        step: "answer_key",
        progress: 75,
        message: "Generating answer key...",
      });

      const answerKeyPrompt = buildAnswerKeyPrompt(promptContext, worksheetHtml);
      const answerKeyResponse = await generateContent(answerKeyPrompt, aiConfig);
      const answerKeyRawHtml = extractHtml(answerKeyResponse.content);
      console.log(`[generator] Answer key generated: ${answerKeyResponse.inputTokens} input, ${answerKeyResponse.outputTokens} output tokens`);

      onProgress?.({
        step: "answer_key",
        progress: 85,
        message: "Adding images to answer key...",
      });
      answerKeyHtml = await processVisualPlaceholders(answerKeyRawHtml);
      console.log("[generator] Answer key images processed");

      totalInputTokens += answerKeyResponse.inputTokens;
      totalOutputTokens += answerKeyResponse.outputTokens;
    } else {
      console.log("[generator] Skipping answer key (not requested)");
    }

    // Calculate actual credits used
    const creditsUsed = calculateCredits(totalInputTokens, totalOutputTokens);
    console.log(`[generator] Total tokens - Input: ${totalInputTokens}, Output: ${totalOutputTokens}, Credits: ${creditsUsed}`);

    // Create project version
    console.log("[generator] Saving project version...");
    onProgress?.({
      step: "complete",
      progress: 95,
      message: "Saving results...",
    });

    // Get the next version number for this project
    const { data: existingVersions } = await supabase
      .from("project_versions")
      .select("version_number")
      .eq("project_id", request.projectId)
      .order("version_number", { ascending: false })
      .limit(1);

    const nextVersionNumber = existingVersions && existingVersions.length > 0
      ? existingVersions[0].version_number + 1
      : 1;
    console.log(`[generator] Creating version ${nextVersionNumber}...`);

    const { data: version, error: versionError } = await supabase
      .from("project_versions")
      .insert({
        project_id: request.projectId,
        version_number: nextVersionNumber,
        worksheet_html: worksheetHtml,
        lesson_plan_html: lessonPlanHtml || null,
        answer_key_html: answerKeyHtml || null,
        ai_provider: config.aiProvider,
        ai_model: config.model || null,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
      })
      .select("id")
      .single();

    if (versionError) {
      console.error("[generator] Failed to save version:", versionError);
      throw new Error(`Failed to save version: ${versionError.message}`);
    }
    console.log(`[generator] Version saved with ID: ${version.id}`);

    // Update project status (credits_used is 0 for Ollama)
    console.log("[generator] Updating project status to 'completed'...");
    await supabase
      .from("projects")
      .update({
        status: "completed",
        credits_used: needsCredits ? creditsUsed : 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", request.projectId);

    // Adjust credits if different from reserved (skip for Local AI)
    if (needsCredits && creditsUsed < ESTIMATED_CREDITS) {
      const refundAmount = ESTIMATED_CREDITS - creditsUsed;
      console.log(`[generator] Refunding ${refundAmount} unused credits...`);
      await refundCredits(
        userId,
        refundAmount,
        request.projectId,
        "Actual usage less than reserved"
      );
    }

    const elapsedTime = Date.now() - startTime;
    console.log(`[generator] Generation complete in ${elapsedTime}ms`);

    onProgress?.({
      step: "complete",
      progress: 100,
      message: "Complete!",
    });

    return {
      projectId: request.projectId,
      versionId: version.id,
      worksheetHtml,
      lessonPlanHtml,
      answerKeyHtml,
      creditsUsed,
    };
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`[generator] Generation failed after ${elapsedTime}ms:`, error);

    // Refund reserved credits on error (skip for Local AI since no credits were reserved)
    if (needsCredits) {
      console.log("[generator] Refunding reserved credits due to error...");
      await refundCredits(
        userId,
        ESTIMATED_CREDITS,
        request.projectId,
        `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Update project status to failed
    console.log("[generator] Updating project status to 'failed'...");
    const supabase = getSupabaseClient();
    await supabase
      .from("projects")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", request.projectId);

    throw error;
  }
}

function extractHtml(content: string): string {
  // If content is wrapped in code blocks, extract it
  const codeBlockMatch = content.match(/```(?:html)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // If it starts with DOCTYPE or html tag, it's probably already HTML
  if (content.trim().startsWith("<!DOCTYPE") || content.trim().startsWith("<html")) {
    return content.trim();
  }

  // Otherwise, wrap in basic HTML structure
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
  </style>
</head>
<body>
${content}
</body>
</html>`;
}

/**
 * Premium Pipeline: Plan → Validate → Assemble → Quality Gate
 *
 * This is the structured generation pipeline that produces higher quality output
 * by using a multi-stage approach with validation and quality checks.
 */
async function generatePremiumTeacherPack(
  request: GenerationRequest,
  userId: string,
  config: GeneratorConfig,
  onProgress?: ProgressCallback
): Promise<GenerationResult> {
  const startTime = Date.now();
  console.log(`[generator:premium] Starting premium pipeline for project ${request.projectId}`);

  const visualSettings = config.visualSettings || DEFAULT_VISUAL_SETTINGS;
  const aiConfig: AIProviderConfig = {
    provider: config.aiProvider,
    model: config.model,
    maxTokens: 8192,
  };

  // Local AI (Ollama) is free - skip credit reservation
  const needsCredits = requiresCredits(config.aiProvider);
  const estimatedCredits = PREMIUM_ESTIMATED_CREDITS;

  // Reserve credits first (skip for Local AI)
  if (needsCredits) {
    console.log(`[generator:premium] Reserving ${estimatedCredits} credits...`);
    const reserved = await reserveCredits(userId, estimatedCredits, request.projectId);
    if (!reserved) {
      console.error("[generator:premium] Failed to reserve credits - insufficient balance");
      throw new Error("Insufficient credits");
    }
    console.log("[generator:premium] Credits reserved successfully");
  } else {
    console.log("[generator:premium] Using Local AI (free) - skipping credit reservation");
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    // Update project status to generating
    const supabase = getSupabaseClient();
    await supabase
      .from("projects")
      .update({ status: "generating" })
      .eq("id", request.projectId);

    // Build premium generation context
    const premiumContext: PremiumGenerationContext = {
      projectId: request.projectId,
      userId,
      prompt: request.prompt,
      grade: request.grade,
      subject: request.subject,
      options: request.options,
      visualSettings,
    };

    // Phase 1: Planning
    console.log("[generator:premium] Phase 1: Creating worksheet plan...");
    onProgress?.({
      step: "worksheet",
      progress: 10,
      message: "Creating worksheet plan...",
    });

    let planResult;
    try {
      planResult = await createWorksheetPlan(premiumContext, aiConfig);
      totalInputTokens += planResult.inputTokens;
      totalOutputTokens += planResult.outputTokens;
      console.log(`[generator:premium] Plan created with ${countQuestions(planResult.plan)} questions`);
    } catch (planError) {
      console.error("[generator:premium] Plan creation failed, using fallback:", planError);
      planResult = {
        plan: createFallbackPlan(premiumContext),
        inputTokens: 0,
        outputTokens: 0,
      };
    }

    // Phase 2: Validation
    console.log("[generator:premium] Phase 2: Validating plan...");
    onProgress?.({
      step: "worksheet",
      progress: 25,
      message: "Validating content quality...",
    });

    const validationRequirements: ValidationRequirements = {
      minQuestions: request.options.questionCount || 10,
      maxQuestions: (request.options.questionCount || 10) + 5,
      grade: request.grade,
      subject: request.subject,
      requireAnswers: true,
    };

    const { plan: validatedPlan, wasRepaired } = await validateAndRepair(
      planResult.plan,
      validationRequirements,
      aiConfig
    );

    if (wasRepaired) {
      console.log("[generator:premium] Plan was auto-repaired");
    }

    // Phase 2.5: Image Generation
    let generatedImages: ImageResult[] = [];
    let imageStats: ImageStats = { total: 0, generated: 0, cached: 0, failed: 0 };
    let acceptedPlacementCount = 0;
    let relevanceStats: ImageStats["relevance"] = null;

    const questionCount = countQuestions(validatedPlan);

    if (visualSettings.includeVisuals && validatedPlan.visualPlacements?.length) {
      console.log("[generator:premium] Phase 2.5: Generating images...");
      onProgress?.({
        step: "images",
        progress: 35,
        message: `Generating ${validatedPlan.visualPlacements.length} images...`,
      });

      // Check if image generation is available
      if (isImageGenerationAvailable()) {
        try {
          // Step 1: Filter and cap placements based on relevance
          const filterResult = filterAndCapPlacements(
            validatedPlan.visualPlacements,
            visualSettings.richness,
            questionCount
          );
          console.log(`[generator:premium] ${getFilterSummary(filterResult)}`);
          acceptedPlacementCount = filterResult.accepted.length;
          relevanceStats = filterResult.stats;

          if (filterResult.accepted.length > 0) {
            // Step 2: Create image requests from filtered placements
            const imageRequests = createImageRequestsFromPlacements(
              filterResult.accepted,
              visualSettings.style
            );

            // Step 3: Generate images with cache and resilience
            const batchResult = await generateBatchImagesWithStats(
              imageRequests,
              {
                grade: request.grade,
                subject: request.subject,
                theme: visualSettings.theme,
              },
              { timeout: 90000, maxRetries: 1 },
              (completed, total) => {
                onProgress?.({
                  step: "images",
                  progress: 35 + (completed / total) * 10,
                  message: `Generated ${completed}/${total} images...`,
                });
              }
            );

            imageStats = batchResult.stats;
            console.log(
              `[generator:premium] Image generation complete: ${imageStats.generated} generated, ${imageStats.cached} cached, ${imageStats.failed} failed`
            );

            // Step 4: Compress images
            onProgress?.({
              step: "images",
              progress: 46,
              message: "Compressing images...",
            });

            const compressedImages = await compressImages(
              batchResult.images,
              visualSettings.richness
            );

            const compressionStats = getCompressionStats(compressedImages);
            console.log(
              `[generator:premium] Compression complete: ${(compressionStats.totalOriginal / 1024 / 1024).toFixed(2)}MB → ${(compressionStats.totalCompressed / 1024 / 1024).toFixed(2)}MB (${(compressionStats.averageRatio * 100).toFixed(0)}%)`
            );

            // Step 5: Validate total size
            const sizeValidation = validateOutputSize(compressedImages, visualSettings.richness);
            if (!sizeValidation.valid) {
              console.warn(`[generator:premium] ${sizeValidation.recommendation}`);
              // Continue anyway - quality gate will catch this
            }

            generatedImages = compressedImages;
          } else {
            console.log("[generator:premium] No images passed relevance filter");
          }
        } catch (imageError) {
          console.error("[generator:premium] Image generation failed:", imageError);
          // Continue without images - quality gate will decide if this is acceptable
        }
      } else {
        console.log("[generator:premium] Image generation unavailable (no OPENAI_API_KEY)");
      }
    } else {
      console.log("[generator:premium] Skipping image generation (not enabled or no placements)");
    }

    // Phase 3: Assembly
    console.log("[generator:premium] Phase 3: Assembling HTML...");
    onProgress?.({
      step: "worksheet",
      progress: 50,
      message: "Building worksheet...",
    });

    const includeLessonPlan =
      request.options.format === "lesson_plan" || request.options.format === "both";
    const includeAnswerKey = request.options.includeAnswerKey !== false;

    const assembled = assembleAll(validatedPlan, {
      includeAnswerKey,
      includeLessonPlan,
      images: generatedImages,
    });

    console.log(`[generator:premium] Assembly complete - Worksheet: ${assembled.worksheetHtml.length} chars`);

    // Phase 4: Quality Gate
    console.log("[generator:premium] Phase 4: Running quality gate...");
    onProgress?.({
      step: "worksheet",
      progress: 80,
      message: "Quality check...",
    });

    const qualityRequirements: QualityRequirements = {
      expectedQuestionCount: request.options.questionCount || 10,
      requireAnswerKey: includeAnswerKey,
      requirePrintFriendly: true,
      expectedImageCount: acceptedPlacementCount,
      visualRichness: visualSettings.richness,
    };

    const qualityResult = await runQualityGate(
      assembled.worksheetHtml,
      validatedPlan,
      qualityRequirements,
      assembled.answerKeyHtml,
      generatedImages,
      visualSettings
    );

    console.log(`[generator:premium] Quality check: ${getQualitySummary(qualityResult)}`);

    // Check if quality gate passed
    if (!qualityResult.shouldCharge) {
      console.error("[generator:premium] Quality gate failed - refunding credits");
      if (needsCredits) {
        await refundCredits(
          userId,
          estimatedCredits,
          request.projectId,
          `Quality gate failed: score ${qualityResult.score}/100`
        );
      }
      throw createQualityGateFailureError(
        qualityResult.score,
        50,
        qualityResult.issues
      );
    }

    // Calculate actual credits used
    const creditsUsed = calculateCredits(totalInputTokens, totalOutputTokens);
    console.log(`[generator:premium] Total tokens - Input: ${totalInputTokens}, Output: ${totalOutputTokens}, Credits: ${creditsUsed}`);

    // Save worksheet plan to database
    console.log("[generator:premium] Saving worksheet plan...");
    const { data: worksheetPlanData, error: planSaveError } = await supabase
      .from("worksheet_plans")
      .insert({
        project_id: request.projectId,
        version_number: 1,
        plan_json: validatedPlan,
        validation_passed: true,
        validation_issues: [],
        repair_attempted: wasRepaired,
        quality_score: qualityResult.score,
        quality_issues: qualityResult.issues,
      })
      .select("id")
      .single();

    if (planSaveError) {
      console.warn("[generator:premium] Failed to save worksheet plan:", planSaveError);
      // Non-fatal - continue with generation
    }

    // Create project version
    console.log("[generator:premium] Saving project version...");
    onProgress?.({
      step: "complete",
      progress: 95,
      message: "Saving results...",
    });

    const { data: existingVersions } = await supabase
      .from("project_versions")
      .select("version_number")
      .eq("project_id", request.projectId)
      .order("version_number", { ascending: false })
      .limit(1);

    const nextVersionNumber =
      existingVersions && existingVersions.length > 0
        ? existingVersions[0].version_number + 1
        : 1;

    const { data: version, error: versionError } = await supabase
      .from("project_versions")
      .insert({
        project_id: request.projectId,
        version_number: nextVersionNumber,
        worksheet_html: assembled.worksheetHtml,
        lesson_plan_html: assembled.lessonPlanHtml || null,
        answer_key_html: assembled.answerKeyHtml || null,
        ai_provider: config.aiProvider,
        ai_model: config.model || null,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        generation_mode: "premium_plan_pipeline",
        plan_id: worksheetPlanData?.id || null,
        image_count: generatedImages.length,
        image_stats: { ...imageStats, relevance: relevanceStats },
        quality_score: qualityResult.score,
      })
      .select("id")
      .single();

    if (versionError) {
      console.error("[generator:premium] Failed to save version:", versionError);
      throw new Error(`Failed to save version: ${versionError.message}`);
    }

    console.log(`[generator:premium] Version saved with ID: ${version.id}`);

    // Update project status
    await supabase
      .from("projects")
      .update({
        status: "completed",
        credits_used: needsCredits ? creditsUsed : 0,
        completed_at: new Date().toISOString(),
        visual_settings: visualSettings,
      })
      .eq("id", request.projectId);

    // Refund unused credits
    if (needsCredits && creditsUsed < estimatedCredits) {
      const refundAmount = estimatedCredits - creditsUsed;
      console.log(`[generator:premium] Refunding ${refundAmount} unused credits...`);
      await refundCredits(
        userId,
        refundAmount,
        request.projectId,
        "Actual usage less than reserved"
      );
    }

    const elapsedTime = Date.now() - startTime;
    console.log(`[generator:premium] Generation complete in ${elapsedTime}ms (quality score: ${qualityResult.score})`);

    onProgress?.({
      step: "complete",
      progress: 100,
      message: "Complete!",
    });

    return {
      projectId: request.projectId,
      versionId: version.id,
      worksheetHtml: assembled.worksheetHtml,
      lessonPlanHtml: assembled.lessonPlanHtml,
      answerKeyHtml: assembled.answerKeyHtml,
      creditsUsed,
      imageStats: { ...imageStats, relevance: relevanceStats },
    };
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`[generator:premium] Generation failed after ${elapsedTime}ms:`, error);

    // Refund reserved credits on error
    if (needsCredits) {
      console.log("[generator:premium] Refunding reserved credits due to error...");
      await refundCredits(
        userId,
        estimatedCredits,
        request.projectId,
        `Premium generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Update project status to failed
    const supabase = getSupabaseClient();
    await supabase
      .from("projects")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", request.projectId);

    throw error;
  }
}

/**
 * Premium Lesson Plan Pipeline: Plan → Validate → Assemble → Quality Gate
 *
 * This pipeline generates structured lesson plans with teacher scripts,
 * materials lists, and student activities. It supports novice teachers
 * with detailed guidance and experienced teachers with concise formats.
 */
async function generatePremiumLessonPlan(
  request: GenerationRequest,
  userId: string,
  config: GeneratorConfig,
  onProgress?: ProgressCallback
): Promise<GenerationResult> {
  const startTime = Date.now();
  console.log(`[generator:lesson-plan] Starting premium lesson plan pipeline for project ${request.projectId}`);

  const visualSettings = config.visualSettings || DEFAULT_VISUAL_SETTINGS;
  const aiConfig: AIProviderConfig = {
    provider: config.aiProvider,
    model: config.model,
    maxTokens: 8192,
  };

  // Local AI (Ollama) is free - skip credit reservation
  const needsCredits = requiresCredits(config.aiProvider);
  const estimatedCredits = PREMIUM_LESSON_PLAN_CREDITS;

  // Reserve credits first (skip for Local AI)
  if (needsCredits) {
    console.log(`[generator:lesson-plan] Reserving ${estimatedCredits} credits...`);
    const reserved = await reserveCredits(userId, estimatedCredits, request.projectId);
    if (!reserved) {
      console.error("[generator:lesson-plan] Failed to reserve credits - insufficient balance");
      throw new Error("Insufficient credits");
    }
    console.log("[generator:lesson-plan] Credits reserved successfully");
  } else {
    console.log("[generator:lesson-plan] Using Local AI (free) - skipping credit reservation");
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    // Update project status to generating
    const supabase = getSupabaseClient();
    await supabase
      .from("projects")
      .update({ status: "generating" })
      .eq("id", request.projectId);

    // Extract lesson plan options
    const lessonLength = (request.options.lessonLength || 30) as LessonLength;
    const studentProfile = (request.options.studentProfile || []) as StudentProfileFlag[];
    const teachingConfidence = (request.options.teachingConfidence || "intermediate") as TeachingConfidence;
    const includeTeacherScript = teachingConfidence === "novice";

    console.log(`[generator:lesson-plan] Options - Length: ${lessonLength}min, Confidence: ${teachingConfidence}, Profile: ${studentProfile.join(", ") || "none"}`);

    // Phase 1: Create Lesson Plan
    console.log("[generator:lesson-plan] Phase 1: Creating lesson plan...");
    onProgress?.({
      step: "lesson_plan",
      progress: 10,
      message: "Creating lesson plan structure...",
    });

    const lessonPlanResult = await createLessonPlan(
      {
        projectId: request.projectId,
        userId,
        prompt: request.prompt,
        grade: request.grade,
        subject: request.subject,
        lessonLength,
        studentProfile,
        teachingConfidence,
      },
      aiConfig
    );

    totalInputTokens += lessonPlanResult.tokensUsed;
    console.log(`[generator:lesson-plan] Lesson plan created with ${lessonPlanResult.plan.sections.length} sections`);

    // Phase 2: Validate and Repair
    console.log("[generator:lesson-plan] Phase 2: Validating lesson plan...");
    onProgress?.({
      step: "lesson_plan",
      progress: 30,
      message: "Validating content quality...",
    });

    const requirements: LessonPlanRequirements = {
      lessonLength,
      teachingConfidence,
      requireTeacherScript: includeTeacherScript,
      requireMaterials: true,
      requireDifferentiation: studentProfile.length > 0,
    };

    const { plan: validatedPlan, validationResult, wasRepaired } = await validateAndRepairLessonPlan(
      lessonPlanResult.plan,
      requirements,
      aiConfig
    );

    if (wasRepaired) {
      console.log("[generator:lesson-plan] Plan was auto-repaired");
    }

    if (!validationResult.valid && !wasRepaired) {
      console.error("[generator:lesson-plan] Validation failed:", validationResult.issues);
      throw new Error(`Lesson plan validation failed: ${validationResult.issues.map(i => i.message).join(", ")}`);
    }

    // Phase 3: Assemble HTML
    console.log("[generator:lesson-plan] Phase 3: Assembling HTML...");
    onProgress?.({
      step: "lesson_plan",
      progress: 50,
      message: "Building lesson plan documents...",
    });

    const assembled = assembleLessonPlanHTML(validatedPlan, {
      includeTeacherScript,
      includeStudentActivity: true,
      includeMaterialsList: true,
      includeTimingHints: true,
    });

    console.log(`[generator:lesson-plan] Assembly complete - Lesson Plan: ${assembled.lessonPlanHtml.length} chars`);
    if (assembled.teacherScriptHtml) {
      console.log(`[generator:lesson-plan] Teacher Script: ${assembled.teacherScriptHtml.length} chars`);
    }

    // Phase 4: Generate Worksheet if format is "both"
    let worksheetHtml = "";
    let answerKeyHtml = "";

    if (request.options.format === "both") {
      console.log("[generator:lesson-plan] Phase 4a: Generating coordinated worksheet...");
      onProgress?.({
        step: "worksheet",
        progress: 65,
        message: "Generating coordinated worksheet...",
      });

      // Build premium generation context for worksheet
      const worksheetContext: PremiumGenerationContext = {
        projectId: request.projectId,
        userId,
        prompt: `${request.prompt} (Aligned with lesson plan objective: ${validatedPlan.metadata.objective})`,
        grade: request.grade,
        subject: request.subject,
        options: request.options,
        visualSettings,
      };

      try {
        const worksheetPlanResult = await createWorksheetPlan(worksheetContext, aiConfig);
        totalInputTokens += worksheetPlanResult.inputTokens;
        totalOutputTokens += worksheetPlanResult.outputTokens;

        const worksheetValidationReqs: ValidationRequirements = {
          minQuestions: request.options.questionCount || 10,
          maxQuestions: (request.options.questionCount || 10) + 5,
          grade: request.grade,
          subject: request.subject,
          requireAnswers: true,
        };

        const { plan: validatedWorksheetPlan } = await validateAndRepair(
          worksheetPlanResult.plan,
          worksheetValidationReqs,
          aiConfig
        );

        const worksheetAssembled = assembleAll(validatedWorksheetPlan, {
          includeAnswerKey: request.options.includeAnswerKey !== false,
          includeLessonPlan: false, // Already have lesson plan
          images: [],
        });

        worksheetHtml = worksheetAssembled.worksheetHtml;
        answerKeyHtml = worksheetAssembled.answerKeyHtml;

        console.log(`[generator:lesson-plan] Worksheet generated: ${worksheetHtml.length} chars`);
      } catch (worksheetError) {
        console.warn("[generator:lesson-plan] Worksheet generation failed, continuing with lesson plan only:", worksheetError);
      }
    }

    // Phase 5: Quality Check
    console.log("[generator:lesson-plan] Phase 5: Running quality check...");
    onProgress?.({
      step: "lesson_plan",
      progress: 85,
      message: "Quality check...",
    });

    // Basic quality checks for lesson plan
    const qualityIssues: string[] = [];
    if (validatedPlan.sections.length < 3) {
      qualityIssues.push("Too few lesson sections");
    }
    if (!validatedPlan.metadata.objective) {
      qualityIssues.push("Missing learning objective");
    }
    if (validatedPlan.materials.length === 0) {
      qualityIssues.push("No materials listed");
    }
    if (includeTeacherScript && !validatedPlan.sections.some(s => s.teacherScript && s.teacherScript.length > 0)) {
      qualityIssues.push("Teacher script missing for novice mode");
    }

    const qualityScore = Math.max(0, 100 - (qualityIssues.length * 15));
    const shouldCharge = qualityScore >= 60;

    console.log(`[generator:lesson-plan] Quality score: ${qualityScore}/100, Issues: ${qualityIssues.join(", ") || "none"}`);

    if (!shouldCharge) {
      console.error("[generator:lesson-plan] Quality gate failed - refunding credits");
      if (needsCredits) {
        await refundCredits(
          userId,
          estimatedCredits,
          request.projectId,
          `Quality gate failed: score ${qualityScore}/100`
        );
      }
      throw createLessonPlanQualityFailureError(qualityScore, 60, qualityIssues);
    }

    // Calculate actual credits used
    const creditsUsed = calculateCredits(totalInputTokens, totalOutputTokens);
    console.log(`[generator:lesson-plan] Total tokens - Input: ${totalInputTokens}, Output: ${totalOutputTokens}, Credits: ${creditsUsed}`);

    // Save project version
    console.log("[generator:lesson-plan] Saving project version...");
    onProgress?.({
      step: "complete",
      progress: 95,
      message: "Saving results...",
    });

    const { data: existingVersions } = await supabase
      .from("project_versions")
      .select("version_number")
      .eq("project_id", request.projectId)
      .order("version_number", { ascending: false })
      .limit(1);

    const nextVersionNumber =
      existingVersions && existingVersions.length > 0
        ? existingVersions[0].version_number + 1
        : 1;

    // Build lesson metadata
    const lessonMetadata = {
      objective: validatedPlan.metadata.objective,
      lessonLength,
      teachingConfidence,
      studentProfile,
      sectionsGenerated: validatedPlan.sections.map(s => s.type),
    };

    const { data: version, error: versionError } = await supabase
      .from("project_versions")
      .insert({
        project_id: request.projectId,
        version_number: nextVersionNumber,
        worksheet_html: worksheetHtml || null,
        lesson_plan_html: assembled.lessonPlanHtml,
        answer_key_html: answerKeyHtml || null,
        teacher_script_html: assembled.teacherScriptHtml || null,
        student_activity_html: assembled.studentActivityHtml || null,
        materials_list_html: assembled.materialsListHtml || null,
        lesson_metadata: lessonMetadata,
        ai_provider: config.aiProvider,
        ai_model: config.model || null,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        generation_mode: "premium_lesson_plan_pipeline",
        quality_score: qualityScore,
      })
      .select("id")
      .single();

    if (versionError) {
      console.error("[generator:lesson-plan] Failed to save version:", versionError);
      throw new Error(`Failed to save version: ${versionError.message}`);
    }

    console.log(`[generator:lesson-plan] Version saved with ID: ${version.id}`);

    // Update project status
    await supabase
      .from("projects")
      .update({
        status: "completed",
        credits_used: needsCredits ? creditsUsed : 0,
        completed_at: new Date().toISOString(),
        visual_settings: visualSettings,
      })
      .eq("id", request.projectId);

    // Refund unused credits
    if (needsCredits && creditsUsed < estimatedCredits) {
      const refundAmount = estimatedCredits - creditsUsed;
      console.log(`[generator:lesson-plan] Refunding ${refundAmount} unused credits...`);
      await refundCredits(
        userId,
        refundAmount,
        request.projectId,
        "Actual usage less than reserved"
      );
    }

    const elapsedTime = Date.now() - startTime;
    console.log(`[generator:lesson-plan] Generation complete in ${elapsedTime}ms (quality score: ${qualityScore})`);

    onProgress?.({
      step: "complete",
      progress: 100,
      message: "Complete!",
    });

    return {
      projectId: request.projectId,
      versionId: version.id,
      worksheetHtml,
      lessonPlanHtml: assembled.lessonPlanHtml,
      answerKeyHtml,
      teacherScriptHtml: assembled.teacherScriptHtml,
      studentActivityHtml: assembled.studentActivityHtml,
      materialsListHtml: assembled.materialsListHtml,
      lessonMetadata,
      creditsUsed,
    };
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`[generator:lesson-plan] Generation failed after ${elapsedTime}ms:`, error);

    // Refund reserved credits on error
    if (needsCredits) {
      console.log("[generator:lesson-plan] Refunding reserved credits due to error...");
      await refundCredits(
        userId,
        estimatedCredits,
        request.projectId,
        `Lesson plan generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Update project status to failed
    const supabase = getSupabaseClient();
    await supabase
      .from("projects")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", request.projectId);

    throw error;
  }
}

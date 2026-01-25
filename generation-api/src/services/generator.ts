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

const ESTIMATED_CREDITS = 5; // Conservative estimate for reservation

export type ProgressCallback = (progress: GenerationProgress) => void;

export interface GeneratorConfig {
  aiProvider: AIProvider;
  model?: string;
}

export async function generateTeacherPack(
  request: GenerationRequest,
  userId: string,
  config: GeneratorConfig,
  onProgress?: ProgressCallback
): Promise<GenerationResult> {
  const startTime = Date.now();
  console.log(`[generator] Starting generation for project ${request.projectId}`);
  console.log(`[generator] User: ${userId}, Provider: ${config.aiProvider}, Model: ${config.model || "default"}`);
  console.log(`[generator] Inspiration items: ${request.inspiration.length}, Pre-polished: ${request.prePolished}`);

  const aiConfig: AIProviderConfig = {
    provider: config.aiProvider,
    model: config.model,
    maxTokens: 8192,
  };

  // Ollama is free - skip credit reservation for local AI
  const isOllama = config.aiProvider === "ollama";

  // Reserve credits first (skip for Ollama)
  if (!isOllama) {
    console.log(`[generator] Reserving ${ESTIMATED_CREDITS} credits...`);
    const reserved = await reserveCredits(userId, ESTIMATED_CREDITS, request.projectId);
    if (!reserved) {
      console.error("[generator] Failed to reserve credits - insufficient balance");
      throw new Error("Insufficient credits");
    }
    console.log("[generator] Credits reserved successfully");
  } else {
    console.log("[generator] Using Ollama (free) - skipping credit reservation");
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
        credits_used: isOllama ? 0 : creditsUsed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", request.projectId);

    // Adjust credits if different from reserved (skip for Ollama)
    if (!isOllama && creditsUsed < ESTIMATED_CREDITS) {
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

    // Refund reserved credits on error (skip for Ollama since no credits were reserved)
    if (!isOllama) {
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

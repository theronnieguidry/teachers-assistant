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
  const aiConfig: AIProviderConfig = {
    provider: config.aiProvider,
    model: config.model,
    maxTokens: 8192,
  };

  // Ollama is free - skip credit reservation for local AI
  const isOllama = config.aiProvider === "ollama";

  // Reserve credits first (skip for Ollama)
  if (!isOllama) {
    const reserved = await reserveCredits(userId, ESTIMATED_CREDITS, request.projectId);
    if (!reserved) {
      throw new Error("Insufficient credits");
    }
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

    // Parse inspiration materials
    onProgress?.({
      step: "worksheet",
      progress: 5,
      message: "Processing inspiration materials...",
    });

    let parsedInspiration: ParsedInspiration[] = [];
    if (request.inspiration.length > 0) {
      parsedInspiration = await parseAllInspiration(request.inspiration, aiConfig);
    }

    // Polish the user's prompt using Ollama (free, runs locally)
    // Skip if already polished client-side
    let polishedPrompt = request.prompt;
    if (!request.prePolished) {
      onProgress?.({
        step: "worksheet",
        progress: 10,
        message: "Refining your request...",
      });

      polishedPrompt = await polishPrompt({
        prompt: request.prompt,
        grade: request.grade,
        subject: request.subject,
        format: request.options.format || "both",
        questionCount: request.options.questionCount || 10,
        difficulty: request.options.difficulty || "medium",
        includeVisuals: request.options.includeVisuals ?? true,
        inspirationTitles: parsedInspiration.map((i) => i.title),
      });
    }

    const promptContext = {
      prompt: polishedPrompt,
      grade: request.grade,
      subject: request.subject,
      options: request.options,
      inspiration: parsedInspiration,
    };

    // Generate worksheet
    onProgress?.({
      step: "worksheet",
      progress: 20,
      message: "Generating worksheet...",
    });

    const worksheetPrompt = buildWorksheetPrompt(promptContext);
    const worksheetResponse = await generateContent(worksheetPrompt, aiConfig);
    const worksheetRawHtml = extractHtml(worksheetResponse.content);

    onProgress?.({
      step: "worksheet",
      progress: 35,
      message: "Adding images to worksheet...",
    });
    const worksheetHtml = await processVisualPlaceholders(worksheetRawHtml);

    totalInputTokens += worksheetResponse.inputTokens;
    totalOutputTokens += worksheetResponse.outputTokens;

    // Generate lesson plan if requested
    let lessonPlanHtml = "";
    if (
      request.options.format === "lesson_plan" ||
      request.options.format === "both"
    ) {
      onProgress?.({
        step: "lesson_plan",
        progress: 50,
        message: "Generating lesson plan...",
      });

      const lessonPlanPrompt = buildLessonPlanPrompt(promptContext);
      const lessonPlanResponse = await generateContent(lessonPlanPrompt, aiConfig);
      const lessonPlanRawHtml = extractHtml(lessonPlanResponse.content);

      onProgress?.({
        step: "lesson_plan",
        progress: 60,
        message: "Adding images to lesson plan...",
      });
      lessonPlanHtml = await processVisualPlaceholders(lessonPlanRawHtml);

      totalInputTokens += lessonPlanResponse.inputTokens;
      totalOutputTokens += lessonPlanResponse.outputTokens;
    }

    // Generate answer key if requested
    let answerKeyHtml = "";
    if (request.options.includeAnswerKey !== false) {
      onProgress?.({
        step: "answer_key",
        progress: 75,
        message: "Generating answer key...",
      });

      const answerKeyPrompt = buildAnswerKeyPrompt(promptContext, worksheetHtml);
      const answerKeyResponse = await generateContent(answerKeyPrompt, aiConfig);
      const answerKeyRawHtml = extractHtml(answerKeyResponse.content);

      onProgress?.({
        step: "answer_key",
        progress: 85,
        message: "Adding images to answer key...",
      });
      answerKeyHtml = await processVisualPlaceholders(answerKeyRawHtml);

      totalInputTokens += answerKeyResponse.inputTokens;
      totalOutputTokens += answerKeyResponse.outputTokens;
    }

    // Calculate actual credits used
    const creditsUsed = calculateCredits(totalInputTokens, totalOutputTokens);

    // Create project version
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
      throw new Error(`Failed to save version: ${versionError.message}`);
    }

    // Update project status (credits_used is 0 for Ollama)
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
      await refundCredits(
        userId,
        ESTIMATED_CREDITS - creditsUsed,
        request.projectId,
        "Actual usage less than reserved"
      );
    }

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
    // Refund reserved credits on error (skip for Ollama since no credits were reserved)
    if (!isOllama) {
      await refundCredits(
        userId,
        ESTIMATED_CREDITS,
        request.projectId,
        `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
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

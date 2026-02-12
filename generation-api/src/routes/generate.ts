import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { generateTeacherPack } from "../services/generator.js";
import { getSupabaseClient } from "../services/credits.js";
import { getResolvedLocalModel } from "../services/ollama-model-manager.js";
import type { GenerationRequest, AIProvider, InspirationItem } from "../types.js";
import type { VisualSettings, GenerationMode } from "../types/premium.js";
import { DEFAULT_VISUAL_SETTINGS } from "../types/premium.js";

const router = Router();

// Default provider from environment, fallback to openai (Claude removed)
const DEFAULT_AI_PROVIDER = (process.env.AI_PROVIDER || "openai") as AIProvider;

const inspirationItemSchema = z.object({
  id: z.string(),
  type: z.enum(["url", "pdf", "image", "text"]),
  title: z.string(),
  sourceUrl: z.string().optional(),
  content: z.string().optional(),
  storagePath: z.string().optional(),
});

const generateRequestSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().min(10).max(2000),
  grade: z.enum(["K", "1", "2", "3", "4", "5", "6"]),
  subject: z.string().min(1),
  options: z
    .object({
      questionCount: z.number().min(5).max(30).optional(),
      includeVisuals: z.boolean().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      format: z.enum(["worksheet", "lesson_plan", "both"]).optional(),
      includeAnswerKey: z.boolean().optional(),
      // Lesson plan options (Issue #17)
      lessonLength: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).optional(),
      studentProfile: z.array(z.enum(["needs_movement", "struggles_reading", "easily_frustrated", "advanced", "ell"])).optional(),
      teachingConfidence: z.enum(["novice", "intermediate", "experienced"]).optional(),
    })
    .optional()
    .default({}),
  inspiration: z.array(inspirationItemSchema).optional().default([]),
  designPackContext: z
    .object({
      packId: z.string().min(1),
      items: z.array(inspirationItemSchema).default([]),
    })
    .optional(),
  inspirationIds: z.array(z.string()).optional(),
  objectiveId: z.string().optional().nullable(),
  // Accept both user-facing (premium, local) and legacy (claude, openai, ollama) provider values
  aiProvider: z.enum(["premium", "local", "claude", "openai", "ollama"]).optional(),
  aiModel: z.string().optional(),
  // Premium pipeline parameters
  generationMode: z.enum(["standard", "premium_plan_pipeline", "premium_lesson_plan_pipeline"]).optional().default("standard"),
  visualSettings: z
    .object({
      includeVisuals: z.boolean().optional().default(true),
      richness: z.enum(["minimal", "standard", "rich"]).optional().default("minimal"),
      style: z.enum(["friendly_cartoon", "simple_icons", "black_white"]).optional().default("friendly_cartoon"),
      theme: z.string().optional(),
    })
    .optional(),
  prePolished: z.boolean().optional().default(false),
});

function extractQualityFailureDetails(error: unknown): {
  code?: string;
  statusCode?: number;
  qualityReport?: unknown;
} {
  if (!error || typeof error !== "object") {
    return {};
  }

  const maybe = error as {
    code?: unknown;
    statusCode?: unknown;
    qualityReport?: unknown;
  };

  return {
    code: typeof maybe.code === "string" ? maybe.code : undefined,
    statusCode: typeof maybe.statusCode === "number" ? maybe.statusCode : undefined,
    qualityReport: maybe.qualityReport,
  };
}

// Fetch inspiration items by IDs from database
async function fetchInspirationItems(ids: string[], userId: string): Promise<InspirationItem[]> {
  if (ids.length === 0) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("inspiration_items")
    .select("id, type, title, source_url, content, storage_path")
    .in("id", ids)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch inspiration items:", error);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    type: item.type as InspirationItem["type"],
    title: item.title || "",
    sourceUrl: item.source_url || undefined,
    content: item.content || undefined,
    storagePath: item.storage_path || undefined,
  }));
}

function createInspirationMergeKey(item: InspirationItem): string {
  return [item.type, item.sourceUrl || "", item.title || "", item.content || "", item.storagePath || ""].join(
    "|"
  );
}

function mergeInspirationItems(primary: InspirationItem[], secondary: InspirationItem[]): InspirationItem[] {
  const merged = new Map<string, InspirationItem>();
  for (const item of [...primary, ...secondary]) {
    const key = createInspirationMergeKey(item);
    if (!merged.has(key)) {
      merged.set(key, item);
    }
  }
  return Array.from(merged.values());
}

router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Validate request body
    const parseResult = generateRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Invalid request",
        details: parseResult.error.issues,
      });
      return;
    }

    const data = parseResult.data;
    const aiProvider = (data.aiProvider || DEFAULT_AI_PROVIDER) as AIProvider;

    // Fetch inspiration items from DB if IDs provided, otherwise use embedded items
    let inspiration = data.inspiration;
    if (data.inspirationIds && data.inspirationIds.length > 0) {
      inspiration = await fetchInspirationItems(data.inspirationIds, req.userId);
    }
    if (data.designPackContext?.items?.length) {
      inspiration = mergeInspirationItems(inspiration, data.designPackContext.items);
    }

    // Build visual settings with defaults
    const visualSettings: VisualSettings = {
      includeVisuals: data.visualSettings?.includeVisuals ?? data.options.includeVisuals ?? true,
      richness: data.visualSettings?.richness ?? "minimal",
      style: data.visualSettings?.style ?? "friendly_cartoon",
      theme: data.visualSettings?.theme,
    };

    const generationMode: GenerationMode = data.generationMode || "standard";

    const request: GenerationRequest = {
      projectId: data.projectId,
      prompt: data.prompt,
      grade: data.grade,
      subject: data.subject,
      options: data.options,
      inspiration,
      objectiveId: data.objectiveId || undefined,
      designPackContext: data.designPackContext
        ? {
            packId: data.designPackContext.packId,
            items: data.designPackContext.items,
          }
        : undefined,
      aiProvider,
      prePolished: data.prePolished,
    };

    const requestedModel = data.aiModel;
    const usingLocalProvider = aiProvider === "local" || aiProvider === "ollama";
    const aiModel = usingLocalProvider
      ? getResolvedLocalModel()
      : requestedModel;

    console.log(
      `[${request.projectId}] Using AI provider: ${aiProvider}${aiModel ? `, model: ${aiModel}` : ""}` +
        ` (mode: ${generationMode})`
    );
    if (usingLocalProvider && requestedModel && requestedModel !== aiModel) {
      console.log(
        `[${request.projectId}] Ignoring requested local model '${requestedModel}' in favor of backend-managed model '${aiModel}'`
      );
    }

    // Set up SSE streaming for progress updates
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendProgress = (progress: { step: string; progress: number; message: string }) => {
      console.log(`[${request.projectId}] ${progress.step}: ${progress.progress}% - ${progress.message}`);
      res.write(`data: ${JSON.stringify({ type: "progress", ...progress })}\n\n`);
    };

    const result = await generateTeacherPack(
      request,
      req.userId,
      {
        aiProvider,
        model: aiModel,
        generationMode,
        visualSettings,
      },
      sendProgress
    );

    // Send final result
    res.write(`data: ${JSON.stringify({ type: "complete", result })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Generation error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const qualityDetails = extractQualityFailureDetails(error);

    // Check if headers already sent (SSE mode)
    if (res.headersSent) {
      const payload: Record<string, unknown> = { type: "error", message: errorMessage };
      if (qualityDetails.code) payload.code = qualityDetails.code;
      if (qualityDetails.statusCode) payload.statusCode = qualityDetails.statusCode;
      if (qualityDetails.qualityReport) payload.qualityReport = qualityDetails.qualityReport;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      res.end();
      return;
    }

    if (error instanceof Error && error.message === "Insufficient credits") {
      res.status(402).json({ error: "Insufficient credits" });
      return;
    }

    if (qualityDetails.qualityReport) {
      res.status(422).json({
        error: "Quality check failed",
        message: errorMessage,
        code: qualityDetails.code || "quality_gate_failed",
        qualityReport: qualityDetails.qualityReport,
      });
      return;
    }

    res.status(500).json({
      error: "Generation failed",
      message: errorMessage,
    });
  }
});

export default router;

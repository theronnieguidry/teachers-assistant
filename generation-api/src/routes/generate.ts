import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { generateTeacherPack } from "../services/generator.js";
import { getSupabaseClient } from "../services/credits.js";
import type { GenerationRequest, AIProvider, InspirationItem } from "../types.js";

const router = Router();

// Default provider from environment, fallback to claude
const DEFAULT_AI_PROVIDER = (process.env.AI_PROVIDER || "claude") as AIProvider;

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
    })
    .optional()
    .default({}),
  inspiration: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["url", "pdf", "image", "text"]),
        title: z.string(),
        sourceUrl: z.string().optional(),
        content: z.string().optional(),
        storagePath: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  inspirationIds: z.array(z.string()).optional(),
  aiProvider: z.enum(["claude", "openai", "ollama"]).optional(),
  aiModel: z.string().optional(),
});

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

    const request: GenerationRequest = {
      projectId: data.projectId,
      prompt: data.prompt,
      grade: data.grade,
      subject: data.subject,
      options: data.options,
      inspiration,
      aiProvider,
    };

    const aiModel = data.aiModel;
    console.log(`[${request.projectId}] Using AI provider: ${aiProvider}${aiModel ? `, model: ${aiModel}` : ""}`);

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
      },
      sendProgress
    );

    // Send final result
    res.write(`data: ${JSON.stringify({ type: "complete", result })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Generation error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Check if headers already sent (SSE mode)
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`);
      res.end();
      return;
    }

    if (error instanceof Error && error.message === "Insufficient credits") {
      res.status(402).json({ error: "Insufficient credits" });
      return;
    }

    res.status(500).json({
      error: "Generation failed",
      message: errorMessage,
    });
  }
});

export default router;

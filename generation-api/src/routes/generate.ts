import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { generateTeacherPack } from "../services/generator.js";
import type { GenerationRequest, AIProvider } from "../types.js";

const router = Router();

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
  aiProvider: z.enum(["claude", "openai"]).optional().default("claude"),
});

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
    const request: GenerationRequest = {
      projectId: data.projectId,
      prompt: data.prompt,
      grade: data.grade,
      subject: data.subject,
      options: data.options,
      inspiration: data.inspiration,
      aiProvider: data.aiProvider as AIProvider,
    };

    // For SSE streaming, we could use res.write() for progress
    // For now, just return the final result
    const result = await generateTeacherPack(
      request,
      req.userId,
      {
        aiProvider: data.aiProvider as AIProvider,
      },
      (progress) => {
        // In a streaming implementation, we'd send progress here
        console.log(
          `[${request.projectId}] ${progress.step}: ${progress.progress}% - ${progress.message}`
        );
      }
    );

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Generation error:", error);

    if (error instanceof Error && error.message === "Insufficient credits") {
      res.status(402).json({ error: "Insufficient credits" });
      return;
    }

    res.status(500).json({
      error: "Generation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

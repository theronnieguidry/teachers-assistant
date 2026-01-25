import { Router } from "express";
import { z } from "zod";
import { polishPrompt, type PolishContext } from "../services/prompt-polisher.js";
import type { Grade } from "../types.js";

const router = Router();

const polishRequestSchema = z.object({
  prompt: z.string().min(1),
  grade: z.enum(["K", "1", "2", "3", "4", "5", "6"]),
  subject: z.string().min(1),
  format: z.enum(["worksheet", "lesson_plan", "both"]),
  questionCount: z.number().int().min(1).max(50),
  difficulty: z.enum(["easy", "medium", "hard"]),
  includeVisuals: z.boolean(),
  inspirationTitles: z.array(z.string()).optional(),
});

/**
 * POST /polish - Polish a user's prompt using Ollama
 *
 * Takes the user's brief prompt and returns an enhanced version
 * optimized for AI content generation.
 */
router.post("/", async (req, res) => {
  try {
    const parseResult = polishRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: parseResult.error.issues,
      });
    }

    const context: PolishContext = {
      prompt: parseResult.data.prompt,
      grade: parseResult.data.grade as Grade,
      subject: parseResult.data.subject,
      format: parseResult.data.format,
      questionCount: parseResult.data.questionCount,
      difficulty: parseResult.data.difficulty,
      includeVisuals: parseResult.data.includeVisuals,
      inspirationTitles: parseResult.data.inspirationTitles,
    };

    const result = await polishPrompt(context);

    res.json({
      original: context.prompt,
      polished: result.polished,
      wasPolished: result.wasPolished,
      skipReason: result.skipReason,
    });
  } catch (error) {
    console.error("Polish endpoint error:", error);
    res.status(500).json({
      error: "Failed to polish prompt",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

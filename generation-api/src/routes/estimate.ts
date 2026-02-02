/**
 * Estimate Route
 *
 * Returns a credit estimate before generation starts.
 * This allows users to see the cost before committing.
 */

import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import type { EstimateResponse, VisualRichness } from "../types/premium.js";

const router = Router();

const estimateRequestSchema = z.object({
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
  visualSettings: z
    .object({
      includeVisuals: z.boolean().optional().default(true),
      richness: z.enum(["minimal", "standard", "rich"]).optional().default("minimal"),
      style: z.enum(["friendly_cartoon", "simple_icons", "black_white"]).optional(),
      theme: z.string().optional(),
    })
    .optional()
    .default({}),
  generationMode: z.enum(["standard", "premium_plan_pipeline"]).optional().default("standard"),
});

/**
 * Calculate estimated credits based on generation parameters
 */
function calculateEstimate(params: z.infer<typeof estimateRequestSchema>): EstimateResponse {
  const questionCount = params.options.questionCount || 10;
  const includeAnswerKey = params.options.includeAnswerKey !== false;
  const includeLessonPlan = params.options.format === "lesson_plan" || params.options.format === "both";
  const includeVisuals = params.visualSettings?.includeVisuals ?? params.options.includeVisuals ?? false;
  const visualRichness = (params.visualSettings?.richness || "minimal") as VisualRichness;

  // Base credits for text generation
  // Estimate: ~1000 tokens per worksheet, ~500 per answer key, ~800 per lesson plan
  let textCredits = 3; // Base for worksheet with ~10 questions

  // Scale with question count
  if (questionCount > 15) {
    textCredits += 1;
  }
  if (questionCount > 25) {
    textCredits += 1;
  }

  // Add for additional documents
  if (includeAnswerKey) {
    textCredits += 1;
  }
  if (includeLessonPlan) {
    textCredits += 1;
  }

  // Premium pipeline has additional planning/validation overhead
  if (params.generationMode === "premium_plan_pipeline") {
    textCredits += 1;
  }

  // Image credits
  let imageCredits = 0;
  let estimatedImages = 0;

  if (includeVisuals) {
    switch (visualRichness) {
      case "minimal":
        estimatedImages = 2;
        imageCredits = 1;
        break;
      case "standard":
        estimatedImages = 4;
        imageCredits = 2;
        break;
      case "rich":
        estimatedImages = Math.min(questionCount, 8);
        imageCredits = 3;
        break;
    }
  }

  // Quality gate is free (included in pipeline)
  const qualityCredits = 0;

  const expectedCredits = textCredits + imageCredits;
  const minCredits = Math.max(3, Math.floor(expectedCredits * 0.8));
  const maxCredits = Math.ceil(expectedCredits * 1.3);

  const notes: string[] = [];

  if (visualRichness === "minimal") {
    notes.push("Minimal visuals selected (1-2 images)");
  } else if (visualRichness === "standard") {
    notes.push("Standard visuals selected (3-5 images)");
  } else if (visualRichness === "rich") {
    notes.push("Rich visuals selected (image per question when helpful)");
  }

  if (includeAnswerKey) {
    notes.push("Answer key included");
  }
  if (includeLessonPlan) {
    notes.push("Lesson plan included");
  }

  return {
    estimate: {
      minCredits,
      maxCredits,
      expectedCredits,
      breakdown: {
        textGeneration: textCredits,
        imageGeneration: imageCredits,
        qualityGate: qualityCredits,
      },
    },
    disclaimer:
      "Actual usage may vary based on content complexity. Unused credits are refunded automatically if generation fails.",
  };
}

router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Validate request body
    const parseResult = estimateRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Invalid request",
        details: parseResult.error.issues,
      });
      return;
    }

    const estimate = calculateEstimate(parseResult.data);

    console.log(
      `[estimate] Grade ${parseResult.data.grade} ${parseResult.data.subject}: ` +
        `${estimate.estimate.expectedCredits} credits (${estimate.estimate.minCredits}-${estimate.estimate.maxCredits})`
    );

    res.json(estimate);
  } catch (error) {
    console.error("Estimate error:", error);
    res.status(500).json({
      error: "Estimate failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

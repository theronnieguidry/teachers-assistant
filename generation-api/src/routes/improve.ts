import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/auth.js";
import { improvementService } from "../services/premium/index.js";
import {
  reserveCredits,
  refundCredits,
  deductCredits,
} from "../services/credits.js";
import { createClient } from "@supabase/supabase-js";
import type { ImprovementType, TargetDocument } from "../types/premium.js";

const router = Router();

// Supabase client for database operations
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Validation schema for improvement requests
const improveRequestSchema = z.object({
  projectId: z.string().uuid(),
  versionId: z.string().uuid(),
  improvementType: z.enum([
    "fix_confusing",
    "simplify",
    "add_questions",
    "add_visuals",
    "make_harder",
    "make_easier",
  ]),
  targetDocument: z.enum(["worksheet", "lesson_plan", "answer_key"]),
  additionalInstructions: z.string().optional(),
});

/**
 * POST /improve
 *
 * Apply an improvement to an existing document version.
 * Creates a new version with the improvements applied.
 */
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId;

  try {
    // Validate request body
    const parsed = improveRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: parsed.error.errors,
      });
    }

    const {
      projectId,
      versionId,
      improvementType,
      targetDocument,
      additionalInstructions,
    } = parsed.data;

    // Fetch the project to verify ownership and get metadata
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        error: "Project not found or access denied",
      });
    }

    // Fetch the version to get current HTML
    const { data: version, error: versionError } = await supabase
      .from("project_versions")
      .select("*")
      .eq("id", versionId)
      .eq("project_id", projectId)
      .single();

    if (versionError || !version) {
      return res.status(404).json({
        error: "Version not found",
      });
    }

    // Get the current HTML for the target document
    const htmlColumnMap: Record<TargetDocument, string> = {
      worksheet: "worksheet_html",
      lesson_plan: "lesson_plan_html",
      answer_key: "answer_key_html",
    };
    const htmlColumn = htmlColumnMap[targetDocument];
    const currentHtml = version[htmlColumn];

    if (!currentHtml) {
      return res.status(400).json({
        error: `No ${targetDocument.replace("_", " ")} content found in this version`,
      });
    }

    // Calculate credit cost
    const creditCost = improvementService.getCreditCost(improvementType as ImprovementType);

    // Check if user has sufficient credits before proceeding
    if (!userId) {
      return res.status(401).json({
        error: "User ID not found",
      });
    }

    // Reserve credits for this operation
    let creditsReserved = false;
    try {
      creditsReserved = await reserveCredits(userId, creditCost, projectId);
      if (!creditsReserved) {
        return res.status(402).json({
          error: "Insufficient credits",
          required: creditCost,
        });
      }
    } catch (creditError) {
      return res.status(402).json({
        error: "Insufficient credits",
        required: creditCost,
      });
    }

    try {
      // Apply the improvement
      const result = await improvementService.applyImprovement({
        projectId,
        versionId,
        improvementType: improvementType as ImprovementType,
        targetDocument: targetDocument as TargetDocument,
        additionalInstructions,
        currentHtml,
        grade: project.grade,
        subject: project.subject,
        options: project.options || {},
        visualSettings: project.visual_settings,
      });

      // Get the next version number
      const { data: maxVersion } = await supabase
        .from("project_versions")
        .select("version_number")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      const newVersionNumber = (maxVersion?.version_number || 0) + 1;

      // Create new version with the improved content
      const newVersionData: Record<string, unknown> = {
        project_id: projectId,
        version_number: newVersionNumber,
        worksheet_html: targetDocument === "worksheet" ? result.improvedHtml : version.worksheet_html,
        lesson_plan_html: targetDocument === "lesson_plan" ? result.improvedHtml : version.lesson_plan_html,
        answer_key_html: targetDocument === "answer_key" ? result.improvedHtml : version.answer_key_html,
        ai_provider: "openai",
        ai_model: "gpt-4o",
        generation_mode: "improvement",
      };

      const { data: newVersion, error: insertError } = await supabase
        .from("project_versions")
        .insert(newVersionData)
        .select()
        .single();

      if (insertError || !newVersion) {
        throw new Error(`Failed to create new version: ${insertError?.message}`);
      }

      // Deduct the credits (already reserved via reserveCredits, just update project)
      await deductCredits(userId, result.creditsUsed, projectId);

      // Update project's updated_at timestamp
      await supabase
        .from("projects")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", projectId);

      return res.json({
        newVersionId: newVersion.id,
        creditsUsed: result.creditsUsed,
        changes: result.changes,
      });
    } catch (improvementError) {
      // Refund credits if improvement failed
      if (creditsReserved && userId) {
        await refundCredits(userId, creditCost, projectId, `Improvement failed: ${improvementType}`);
      }

      console.error("Improvement failed:", improvementError);
      return res.status(500).json({
        error: "Improvement failed",
        message: improvementError instanceof Error ? improvementError.message : "Unknown error",
      });
    }
  } catch (error) {
    console.error("Error in /improve route:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

/**
 * GET /improve/estimate
 *
 * Get the credit cost for an improvement type.
 */
router.get("/estimate", authMiddleware, async (req: Request, res: Response) => {
  const improvementType = req.query.type as string;

  if (!improvementType) {
    return res.status(400).json({
      error: "Missing improvement type parameter",
    });
  }

  const validTypes: ImprovementType[] = [
    "fix_confusing",
    "simplify",
    "add_questions",
    "add_visuals",
    "make_harder",
    "make_easier",
  ];

  if (!validTypes.includes(improvementType as ImprovementType)) {
    return res.status(400).json({
      error: "Invalid improvement type",
      validTypes,
    });
  }

  const creditCost = improvementService.getCreditCost(improvementType as ImprovementType);

  return res.json({
    improvementType,
    creditCost,
    description: getImprovementDescription(improvementType as ImprovementType),
  });
});

function getImprovementDescription(type: ImprovementType): string {
  const descriptions: Record<ImprovementType, string> = {
    fix_confusing: "Reword unclear questions to be more understandable",
    simplify: "Lower vocabulary level and add more hints",
    add_questions: "Add 3-5 more practice questions on the same topic",
    add_visuals: "Generate and add 2 more relevant images",
    make_harder: "Increase difficulty with more challenging content",
    make_easier: "Decrease difficulty with simpler vocabulary and more scaffolding",
  };
  return descriptions[type];
}

export default router;

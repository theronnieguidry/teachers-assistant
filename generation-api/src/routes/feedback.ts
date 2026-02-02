import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// Zod schema for feedback request validation
const feedbackRequestSchema = z.object({
  type: z.enum(["bug", "feature"]),
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(2000),
  contactEmail: z.string().email().optional().or(z.literal("")),
  appVersion: z.string().optional(),
});

// Map feedback type to GitHub label
const typeToLabel: Record<string, string> = {
  bug: "bug",
  feature: "enhancement",
};

/**
 * POST /feedback - Submit user feedback as a GitHub issue
 *
 * Requires authentication. Creates a GitHub issue in the repository
 * with appropriate labels based on feedback type.
 */
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Verify authentication
    if (!req.userId || !req.userEmail) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Validate request body
    const parseResult = feedbackRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Invalid request",
        details: parseResult.error.issues,
      });
      return;
    }

    const { type, title, description, contactEmail, appVersion } =
      parseResult.data;

    // Check for required environment variables
    const githubToken = process.env.GITHUB_FEEDBACK_TOKEN;
    const repoOwner =
      process.env.GITHUB_REPO_OWNER || "theronnieguidry";
    const repoName =
      process.env.GITHUB_REPO_NAME || "teachers-assistant";

    if (!githubToken) {
      console.error("GITHUB_FEEDBACK_TOKEN not configured");
      res.status(500).json({
        error: "Feedback service not configured",
        message: "GitHub integration is not set up. Please contact support.",
      });
      return;
    }

    // Format the issue body
    const feedbackTypeLabel = type === "bug" ? "Bug Report" : "Feature Request";
    const issueBody = `## Feedback Type
${feedbackTypeLabel}

## Description
${description}

---
**Submitted by:** ${req.userEmail}
${contactEmail && contactEmail !== req.userEmail ? `**Contact email:** ${contactEmail}` : ""}
**App version:** ${appVersion || "Unknown"}
**Submitted at:** ${new Date().toISOString()}`;

    // Create GitHub issue
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          title: `[${feedbackTypeLabel}] ${title}`,
          body: issueBody,
          labels: [typeToLabel[type]],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("GitHub API error:", response.status, errorData);
      res.status(500).json({
        error: "Failed to submit feedback",
        message: "Could not create GitHub issue. Please try again later.",
      });
      return;
    }

    const issueData = (await response.json()) as {
      number: number;
      html_url: string;
    };

    console.log(
      `Feedback submitted: Issue #${issueData.number} created by ${req.userEmail}`
    );

    res.status(201).json({
      success: true,
      issueNumber: issueData.number,
      issueUrl: issueData.html_url,
    });
  } catch (error) {
    console.error("Feedback submission error:", error);
    res.status(500).json({
      error: "Failed to submit feedback",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

/**
 * Quality Gate Service
 *
 * Final QA checks before charging credits.
 * Validates HTML output meets quality standards.
 */

import type {
  WorksheetPlan,
  QualityCheckResult,
  QualityIssue,
  QualityRequirements,
  ImageResult,
  VisualSettings,
  VisualRichness,
} from "../../types/premium.js";
import { countQuestions } from "./worksheet-planner.js";
import { SIZE_THRESHOLDS } from "./image-compressor.js";
import { RICHNESS_CAPS, MAX_RICH_IMAGES } from "./image-relevance-gate.js";

// Minimum passing score to charge credits
const MIN_PASSING_SCORE = 70;
const MIN_CHARGE_SCORE = 50;

/**
 * Check if HTML is valid and parseable
 */
function checkHtmlStructure(html: string): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Check for basic HTML structure
  if (!html.includes("<!DOCTYPE html>") && !html.includes("<!doctype html>")) {
    issues.push({
      category: "html_structure",
      severity: "warning",
      message: "Missing DOCTYPE declaration",
    });
  }

  if (!html.includes("<html") || !html.includes("</html>")) {
    issues.push({
      category: "html_structure",
      severity: "error",
      message: "Missing or incomplete HTML tags",
    });
  }

  if (!html.includes("<head") || !html.includes("</head>")) {
    issues.push({
      category: "html_structure",
      severity: "warning",
      message: "Missing HEAD section",
    });
  }

  if (!html.includes("<body") || !html.includes("</body>")) {
    issues.push({
      category: "html_structure",
      severity: "error",
      message: "Missing BODY section",
    });
  }

  // Check for style tag
  if (!html.includes("<style")) {
    issues.push({
      category: "html_structure",
      severity: "warning",
      message: "Missing inline styles - output may not render correctly",
    });
  }

  // Check for unclosed tags (basic check)
  const openTags = (html.match(/<[a-z][a-z0-9]*[^/]*>/gi) || []).length;
  const closeTags = (html.match(/<\/[a-z][a-z0-9]*>/gi) || []).length;
  if (Math.abs(openTags - closeTags) > 5) {
    issues.push({
      category: "html_structure",
      severity: "warning",
      message: "Possible unclosed HTML tags detected",
    });
  }

  return issues;
}

/**
 * Count questions in HTML by looking for question patterns
 */
function countQuestionsInHtml(html: string): number {
  // Count by question number patterns
  const patterns = [
    /<span[^>]*class="question-number"[^>]*>/gi,
    /class="question"/gi,
    /<div[^>]*class="[^"]*question[^"]*"[^>]*>/gi,
  ];

  let maxCount = 0;
  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) {
      maxCount = Math.max(maxCount, matches.length);
    }
  }

  // Also try counting by numbered list items if question classes not found
  if (maxCount === 0) {
    // Count numbered items like "1." "2." etc.
    const numberedPattern = /\b(\d{1,2})\.\s/g;
    const matches = html.match(numberedPattern);
    if (matches) {
      // Get unique numbers to avoid counting duplicates
      const numbers = new Set(matches.map((m) => parseInt(m)));
      maxCount = numbers.size;
    }
  }

  return maxCount;
}

/**
 * Check for print-unfriendly elements
 */
function checkPrintFriendly(html: string): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Check for interactive elements
  if (html.includes("<input") || html.includes("<form")) {
    issues.push({
      category: "print_friendly",
      severity: "error",
      message: "Contains interactive form elements (not print-friendly)",
    });
  }

  // Check for external resources
  if (html.includes("fonts.googleapis.com") || html.includes("@import url")) {
    issues.push({
      category: "print_friendly",
      severity: "warning",
      message: "Uses external fonts which may not work when printed",
    });
  }

  // Check for non-printable CSS
  const nonPrintablePatterns = [
    "box-shadow",
    "text-shadow",
    "linear-gradient",
    "radial-gradient",
    "animation",
    "@keyframes",
  ];

  for (const pattern of nonPrintablePatterns) {
    if (html.includes(pattern)) {
      issues.push({
        category: "print_friendly",
        severity: "warning",
        message: `Contains ${pattern} which may not print correctly`,
      });
      break; // Only report one
    }
  }

  // Check for external images (not base64)
  const externalImagePattern =
    /src=["']https?:\/\/[^"']+["']/gi;
  if (externalImagePattern.test(html)) {
    issues.push({
      category: "print_friendly",
      severity: "warning",
      message: "Contains external images which may not load when printing",
    });
  }

  return issues;
}

/**
 * Check for required student info elements
 */
function checkStudentInfo(html: string): QualityIssue[] {
  const issues: QualityIssue[] = [];

  const hasNameLine =
    html.toLowerCase().includes("name:") ||
    html.toLowerCase().includes("name :");
  const hasDateLine =
    html.toLowerCase().includes("date:") ||
    html.toLowerCase().includes("date :");

  if (!hasNameLine) {
    issues.push({
      category: "content_quality",
      severity: "warning",
      message: "Missing Name line for student identification",
    });
  }

  if (!hasDateLine) {
    issues.push({
      category: "content_quality",
      severity: "warning",
      message: "Missing Date line",
    });
  }

  return issues;
}

/**
 * Check answer key quality
 */
function checkAnswerKey(
  worksheetHtml: string,
  answerKeyHtml: string
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  if (!answerKeyHtml || answerKeyHtml.trim().length < 100) {
    issues.push({
      category: "answer_key",
      severity: "error",
      message: "Answer key is empty or too short",
    });
    return issues;
  }

  // Check answer key has "ANSWER KEY" marker
  if (
    !answerKeyHtml.toLowerCase().includes("answer key") &&
    !answerKeyHtml.toLowerCase().includes("answer-key")
  ) {
    issues.push({
      category: "answer_key",
      severity: "warning",
      message: "Answer key missing clear title/header",
    });
  }

  // Count questions in both
  const worksheetQuestions = countQuestionsInHtml(worksheetHtml);
  const answerKeyAnswers = countQuestionsInHtml(answerKeyHtml);

  if (worksheetQuestions > 0 && answerKeyAnswers > 0) {
    if (answerKeyAnswers < worksheetQuestions * 0.8) {
      issues.push({
        category: "answer_key",
        severity: "error",
        message: `Answer key may be incomplete: ${answerKeyAnswers} answers for ${worksheetQuestions} questions`,
      });
    }
  }

  return issues;
}

/**
 * Check content is not placeholder or empty
 */
function checkContentQuality(html: string): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Check for placeholder text
  const placeholders = [
    "[Question",
    "[Answer",
    "Lorem ipsum",
    "TODO",
    "PLACEHOLDER",
    "[Insert",
    "TBD",
  ];

  for (const placeholder of placeholders) {
    if (html.includes(placeholder)) {
      issues.push({
        category: "content_quality",
        severity: "error",
        message: `Contains placeholder text: "${placeholder}"`,
      });
    }
  }

  // Check for minimum content length
  // Strip HTML tags and count text
  const textContent = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (textContent.length < 200) {
    issues.push({
      category: "content_quality",
      severity: "error",
      message: "Content appears too short - may be incomplete",
    });
  }

  return issues;
}

// ============================================
// Image Quality Checks
// ============================================

/**
 * Check if image count matches expected for richness level
 */
function checkImageCount(
  images: ImageResult[],
  expectedCount: number,
  richness: VisualRichness,
  questionCount: number
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Calculate cap for richness level
  const cap = richness === "rich"
    ? Math.min(questionCount, MAX_RICH_IMAGES)
    : (RICHNESS_CAPS[richness] as number);

  // Check if we have too many images (shouldn't happen with relevance gate, but check anyway)
  if (images.length > cap) {
    issues.push({
      category: "image_count",
      severity: "warning",
      message: `Too many images (${images.length}) for richness level '${richness}' (cap: ${cap})`,
    });
  }

  // Check if we have significantly fewer images than expected
  if (expectedCount > 0 && images.length < expectedCount * 0.5) {
    issues.push({
      category: "image_count",
      severity: "warning",
      message: `Image count lower than expected: ${images.length} of ${expectedCount} generated`,
    });
  }

  return issues;
}

/**
 * Check total image size is within thresholds
 */
function checkImageSizes(
  images: ImageResult[],
  richness: VisualRichness
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Calculate total size from base64 (approximate: base64 is ~1.33x original)
  let totalBytes = 0;
  for (const image of images) {
    // Skip placeholders
    if (image.base64Data.startsWith("placeholder:")) {
      continue;
    }
    // Estimate bytes from base64 length
    totalBytes += Math.ceil(image.base64Data.length * 0.75);
  }

  const maxAllowed = SIZE_THRESHOLDS[richness];
  const percentUsed = (totalBytes / maxAllowed) * 100;

  if (totalBytes > maxAllowed) {
    issues.push({
      category: "image_size",
      severity: "error",
      message: `Total image size (${(totalBytes / 1024 / 1024).toFixed(2)}MB) exceeds limit (${(maxAllowed / 1024 / 1024).toFixed(0)}MB)`,
    });
  } else if (percentUsed > 90) {
    issues.push({
      category: "image_size",
      severity: "warning",
      message: `Image size at ${percentUsed.toFixed(0)}% of limit - close to threshold`,
    });
  }

  return issues;
}

/**
 * Check that images were generated successfully (not placeholders)
 */
function checkImageResolution(
  images: ImageResult[],
  expectedCount: number
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  if (images.length === 0 && expectedCount > 0) {
    issues.push({
      category: "image_missing",
      severity: "warning",
      message: `No images generated (expected ${expectedCount})`,
    });
    return issues;
  }

  // Count placeholders
  const placeholderCount = images.filter(
    (img) => img.base64Data.startsWith("placeholder:")
  ).length;

  const successCount = images.length - placeholderCount;
  const successRate = images.length > 0 ? successCount / images.length : 1;

  if (successRate < 0.8) {
    issues.push({
      category: "image_missing",
      severity: "warning",
      message: `Only ${successCount}/${images.length} images generated successfully (${(successRate * 100).toFixed(0)}% success rate)`,
    });
  }

  if (placeholderCount > 0) {
    issues.push({
      category: "image_missing",
      severity: "warning",
      message: `${placeholderCount} image${placeholderCount > 1 ? "s" : ""} replaced with placeholders due to generation failures`,
    });
  }

  return issues;
}

/**
 * Calculate quality score from issues
 */
function calculateScore(issues: QualityIssue[]): number {
  let score = 100;

  for (const issue of issues) {
    if (issue.severity === "error") {
      if (issue.category === "html_structure") {
        score -= 15;
      } else if (issue.category === "question_count") {
        score -= 20;
      } else if (issue.category === "content_quality") {
        score -= 20;
      } else if (issue.category === "answer_key") {
        score -= 10;
      } else if (issue.category === "image_size") {
        score -= 15; // Size threshold exceeded
      } else if (issue.category === "image_count") {
        score -= 10;
      } else if (issue.category === "image_missing") {
        score -= 10;
      } else {
        score -= 10;
      }
    } else if (issue.severity === "warning") {
      score -= 5;
    }
  }

  return Math.max(0, score);
}

/**
 * Run the quality gate on generated content
 */
export async function runQualityGate(
  worksheetHtml: string,
  plan: WorksheetPlan,
  requirements: QualityRequirements,
  answerKeyHtml?: string,
  images?: ImageResult[],
  visualSettings?: VisualSettings
): Promise<QualityCheckResult> {
  const issues: QualityIssue[] = [];

  // 1. Check HTML structure
  issues.push(...checkHtmlStructure(worksheetHtml));

  // 2. Check question count matches plan
  const htmlQuestionCount = countQuestionsInHtml(worksheetHtml);
  const planQuestionCount = countQuestions(plan);
  const expectedCount = requirements.expectedQuestionCount;

  if (htmlQuestionCount === 0) {
    issues.push({
      category: "question_count",
      severity: "error",
      message: "No questions detected in worksheet HTML",
    });
  } else if (htmlQuestionCount < expectedCount * 0.8) {
    issues.push({
      category: "question_count",
      severity: "error",
      message: `Question count mismatch: found ${htmlQuestionCount}, expected ${expectedCount}`,
    });
  } else if (htmlQuestionCount !== expectedCount) {
    issues.push({
      category: "question_count",
      severity: "warning",
      message: `Question count slightly off: found ${htmlQuestionCount}, expected ${expectedCount}`,
    });
  }

  // 3. Check print-friendly
  if (requirements.requirePrintFriendly) {
    issues.push(...checkPrintFriendly(worksheetHtml));
  }

  // 4. Check student info
  issues.push(...checkStudentInfo(worksheetHtml));

  // 5. Check content quality
  issues.push(...checkContentQuality(worksheetHtml));

  // 6. Check answer key if required
  if (requirements.requireAnswerKey) {
    issues.push(...checkAnswerKey(worksheetHtml, answerKeyHtml || ""));
  }

  // 7. Check images if provided
  if (images && visualSettings?.includeVisuals) {
    const richness = requirements.visualRichness || visualSettings.richness;
    const expectedImageCount = requirements.expectedImageCount || (plan.visualPlacements?.length || 0);

    // Image count check
    issues.push(...checkImageCount(images, expectedImageCount, richness, planQuestionCount));

    // Image size check
    issues.push(...checkImageSizes(images, richness));

    // Image resolution check (placeholders vs real images)
    issues.push(...checkImageResolution(images, expectedImageCount));
  }

  // Calculate final score
  const score = calculateScore(issues);

  // Log summary
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const imageIssueCount = issues.filter((i) =>
    i.category === "image_count" || i.category === "image_size" || i.category === "image_missing"
  ).length;
  console.log(
    `[quality-gate] Score: ${score}/100 (${errorCount} errors, ${warningCount} warnings${imageIssueCount > 0 ? `, ${imageIssueCount} image issues` : ""})`
  );

  return {
    passed: score >= MIN_PASSING_SCORE,
    score,
    issues,
    shouldCharge: score >= MIN_CHARGE_SCORE,
  };
}

/**
 * Get a human-readable summary of quality issues
 */
export function getQualitySummary(result: QualityCheckResult): string {
  if (result.passed) {
    return `Quality check passed with score ${result.score}/100`;
  }

  const criticalIssues = result.issues
    .filter((i) => i.severity === "error")
    .map((i) => `- ${i.message}`)
    .join("\n");

  return `Quality check failed (score: ${result.score}/100)\n\nIssues:\n${criticalIssues}`;
}

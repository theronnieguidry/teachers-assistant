/**
 * Worksheet Validator Service
 *
 * Validates WorksheetPlan for pedagogical quality and structural correctness.
 * Can auto-repair minor issues with one retry.
 */

import { generateContent, type AIProviderConfig } from "../ai-provider.js";
import { buildRepairPrompt } from "../../prompts/premium-templates.js";
import type {
  WorksheetPlan,
  PlanValidationResult,
  ValidationIssue,
  ValidationRequirements,
  Grade,
  ImagePurpose,
} from "../../types/premium.js";
import { countQuestions } from "./worksheet-planner.js";

/**
 * Grade-appropriate vocabulary word lists (simplified)
 */
const GRADE_MAX_SYLLABLES: Record<Grade, number> = {
  K: 2,
  "1": 2,
  "2": 3,
  "3": 3,
  "4": 4,
  "5": 4,
  "6": 5,
};

const GRADE_MAX_SENTENCE_LENGTH: Record<Grade, number> = {
  K: 8,
  "1": 10,
  "2": 15,
  "3": 20,
  "4": 25,
  "5": 30,
  "6": 35,
};

/**
 * Valid image purposes for visualPlacements validation
 */
const VALID_IMAGE_PURPOSES = new Set<string>([
  "counting_support",
  "phonics_cue",
  "shape_diagram",
  "word_problem_context",
  "science_diagram_simple",
  "matching_support",
  "diagram",
  "illustration",
  "decoration",
]);

/**
 * Valid placement sizes (no "large" — use "medium" instead)
 */
const VALID_PLACEMENT_SIZES = new Set<string>(["small", "medium", "wide"]);

/**
 * Estimate syllable count in a word (simple heuristic)
 */
function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned.length <= 3) return 1;

  // Count vowel groups
  const vowelGroups = cleaned.match(/[aeiouy]+/gi);
  if (!vowelGroups) return 1;

  let count = vowelGroups.length;

  // Silent e at end
  if (cleaned.endsWith("e") && cleaned.length > 3) {
    count--;
  }
  // le at end adds syllable
  if (cleaned.endsWith("le") && cleaned.length > 3) {
    count++;
  }

  return Math.max(1, count);
}

/**
 * Count words in a sentence
 */
function countWords(sentence: string): number {
  return sentence
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Check if text is grade-appropriate
 */
function checkGradeAppropriateness(
  text: string,
  grade: Grade
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const maxSyllables = GRADE_MAX_SYLLABLES[grade];
  const maxSentenceLength = GRADE_MAX_SENTENCE_LENGTH[grade];

  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  for (const sentence of sentences) {
    const wordCount = countWords(sentence);
    if (wordCount > maxSentenceLength) {
      issues.push({
        severity: "warning",
        field: "content",
        message: `Sentence too long for grade ${grade} (${wordCount} words, max ${maxSentenceLength})`,
        suggestion: "Break into shorter sentences",
      });
    }

    // Check for complex words
    const words = sentence.split(/\s+/);
    for (const word of words) {
      const syllables = countSyllables(word);
      if (syllables > maxSyllables + 1) {
        issues.push({
          severity: "warning",
          field: "vocabulary",
          message: `Complex word "${word}" may be difficult for grade ${grade}`,
          suggestion: `Consider simpler alternatives (word has ~${syllables} syllables)`,
        });
      }
    }
  }

  return issues;
}

/**
 * Validate the worksheet plan against requirements
 */
export async function validatePlan(
  plan: WorksheetPlan,
  requirements: ValidationRequirements
): Promise<PlanValidationResult> {
  const issues: ValidationIssue[] = [];

  // 1. Check question count
  const totalQuestions = countQuestions(plan);
  if (totalQuestions < requirements.minQuestions) {
    issues.push({
      severity: "error",
      field: "structure.sections",
      message: `Not enough questions: found ${totalQuestions}, expected at least ${requirements.minQuestions}`,
      suggestion: `Add ${requirements.minQuestions - totalQuestions} more questions`,
    });
  }
  if (totalQuestions > requirements.maxQuestions) {
    issues.push({
      severity: "warning",
      field: "structure.sections",
      message: `Too many questions: found ${totalQuestions}, expected at most ${requirements.maxQuestions}`,
      suggestion: `Remove ${totalQuestions - requirements.maxQuestions} questions`,
    });
  }

  // 2. Check for duplicate question IDs
  const questionIds = new Set<string>();
  for (const section of plan.structure.sections) {
    for (const item of section.items) {
      if (questionIds.has(item.id)) {
        issues.push({
          severity: "error",
          field: `sections.items.${item.id}`,
          message: `Duplicate question ID: ${item.id}`,
          suggestion: "Ensure all question IDs are unique",
        });
      }
      questionIds.add(item.id);
    }
  }

  // 3. Check all questions have answers
  if (requirements.requireAnswers) {
    for (const section of plan.structure.sections) {
      for (const item of section.items) {
        if (
          !item.correctAnswer ||
          item.correctAnswer.trim() === "" ||
          item.correctAnswer === "[Answer to be determined]"
        ) {
          issues.push({
            severity: "error",
            field: `sections.items.${item.id}.correctAnswer`,
            message: `Question ${item.id} is missing a correct answer`,
            suggestion: "Provide the correct answer for this question",
          });
        }
      }
    }
  }

  // 4. Check multiple choice questions have options
  for (const section of plan.structure.sections) {
    for (const item of section.items) {
      if (item.questionType === "multiple_choice") {
        if (!item.options || item.options.length < 2) {
          issues.push({
            severity: "error",
            field: `sections.items.${item.id}.options`,
            message: `Multiple choice question ${item.id} needs at least 2 options`,
            suggestion: "Add answer options A, B, C, D",
          });
        } else if (!item.options.includes(item.correctAnswer)) {
          // Check if answer is in options (allowing for format differences)
          const answerInOptions = item.options.some(
            (opt) =>
              opt === item.correctAnswer ||
              opt.includes(item.correctAnswer) ||
              item.correctAnswer.includes(opt)
          );
          if (!answerInOptions) {
            issues.push({
              severity: "error",
              field: `sections.items.${item.id}.correctAnswer`,
              message: `Correct answer "${item.correctAnswer}" not found in options for question ${item.id}`,
              suggestion:
                "Ensure correctAnswer exactly matches one of the options",
            });
          }
        }
      }
    }
  }

  // 5. Check grade appropriateness of content
  for (const section of plan.structure.sections) {
    for (const item of section.items) {
      const contentIssues = checkGradeAppropriateness(
        item.questionText,
        requirements.grade
      );
      issues.push(...contentIssues.slice(0, 2)); // Limit to 2 per question
    }
  }

  // 6. Check instructions are grade-appropriate
  if (plan.structure.header.instructions) {
    const instructionIssues = checkGradeAppropriateness(
      plan.structure.header.instructions,
      requirements.grade
    );
    issues.push(...instructionIssues);
  }

  // 7. Check for empty question text
  for (const section of plan.structure.sections) {
    for (const item of section.items) {
      if (!item.questionText || item.questionText.trim().length < 5) {
        issues.push({
          severity: "error",
          field: `sections.items.${item.id}.questionText`,
          message: `Question ${item.id} has empty or very short text`,
          suggestion: "Provide a complete question",
        });
      }
    }
  }

  // 8. Strip per-item visual fields (visualPlacements is the sole source of truth)
  const visualFieldNames = ["visualHint", "imageDescription", "visual", "image", "visualDescription"];
  for (const section of plan.structure.sections) {
    for (const item of section.items) {
      const itemAny = item as unknown as Record<string, unknown>;
      for (const field of visualFieldNames) {
        if (field in itemAny) {
          delete itemAny[field];
          issues.push({
            severity: "warning",
            field: `sections.items.${item.id}.${field}`,
            message: `Stripped per-item visual field "${field}" from ${item.id} — use visualPlacements[] instead`,
            suggestion: "Move visual data to the top-level visualPlacements array",
          });
        }
      }
    }
  }

  // 9. Validate visualPlacements entries
  if (plan.visualPlacements && plan.visualPlacements.length > 0) {
    for (let i = 0; i < plan.visualPlacements.length; i++) {
      const placement = plan.visualPlacements[i];
      const prefix = `visualPlacements[${i}]`;

      // 9a. Check afterItemId references a valid item
      if (!questionIds.has(placement.afterItemId)) {
        issues.push({
          severity: "warning",
          field: `${prefix}.afterItemId`,
          message: `Visual placement references non-existent item "${placement.afterItemId}"`,
          suggestion: "Use a valid item ID from the worksheet",
        });
      }

      // 9b. Check description is non-empty
      if (!placement.description || placement.description.trim().length === 0) {
        issues.push({
          severity: "warning",
          field: `${prefix}.description`,
          message: `Visual placement ${i} has empty description`,
          suggestion: "Provide a 2-3 word description for image generation",
        });
      }

      // 9c. Check purpose is valid
      if (placement.purpose && !VALID_IMAGE_PURPOSES.has(placement.purpose)) {
        issues.push({
          severity: "warning",
          field: `${prefix}.purpose`,
          message: `Visual placement ${i} has invalid purpose "${placement.purpose}"`,
          suggestion: `Use one of: ${[...VALID_IMAGE_PURPOSES].join(", ")}`,
        });
      }

      // 9d. Check size is valid (no "large")
      if (placement.size && !VALID_PLACEMENT_SIZES.has(placement.size as string)) {
        issues.push({
          severity: "warning",
          field: `${prefix}.size`,
          message: `Visual placement ${i} has invalid size "${placement.size}"`,
          suggestion: "Use one of: small, medium, wide",
        });
      }
    }
  }

  // Determine if issues are auto-repairable
  const errors = issues.filter((i) => i.severity === "error");
  const autoRepairable = errors.length > 0 && errors.length <= 5;

  return {
    valid: errors.length === 0,
    issues,
    autoRepairable,
  };
}

/**
 * Attempt to repair a plan using AI
 */
export async function attemptRepair(
  plan: WorksheetPlan,
  issues: ValidationIssue[],
  aiConfig: AIProviderConfig
): Promise<WorksheetPlan> {
  console.log(
    `[worksheet-validator] Attempting repair for ${issues.length} issues`
  );

  const prompt = buildRepairPrompt(plan, issues);

  const response = await generateContent(prompt, {
    ...aiConfig,
    maxTokens: 4096,
  });

  // Parse the repaired plan
  let cleaned = response.content.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  try {
    const repairedPlan = JSON.parse(cleaned.trim()) as WorksheetPlan;
    console.log("[worksheet-validator] Repair successful");
    return repairedPlan;
  } catch (error) {
    console.error("[worksheet-validator] Repair failed to produce valid JSON");
    throw new Error("Plan repair failed to produce valid JSON");
  }
}

/**
 * Validate and optionally repair a plan
 */
export async function validateAndRepair(
  plan: WorksheetPlan,
  requirements: ValidationRequirements,
  aiConfig: AIProviderConfig
): Promise<{
  plan: WorksheetPlan;
  validationResult: PlanValidationResult;
  wasRepaired: boolean;
  repairTokens?: { input: number; output: number };
}> {
  // Initial validation
  const initialResult = await validatePlan(plan, requirements);

  if (initialResult.valid) {
    return {
      plan,
      validationResult: initialResult,
      wasRepaired: false,
    };
  }

  // Check if repair is possible
  if (!initialResult.autoRepairable) {
    console.log(
      "[worksheet-validator] Too many errors for auto-repair, returning as-is"
    );
    return {
      plan,
      validationResult: initialResult,
      wasRepaired: false,
    };
  }

  // Attempt repair
  try {
    const repairedPlan = await attemptRepair(
      plan,
      initialResult.issues.filter((i) => i.severity === "error"),
      aiConfig
    );

    // Re-validate repaired plan
    const revalidationResult = await validatePlan(repairedPlan, requirements);

    return {
      plan: repairedPlan,
      validationResult: revalidationResult,
      wasRepaired: true,
    };
  } catch (error) {
    console.error("[worksheet-validator] Repair attempt failed:", error);
    return {
      plan,
      validationResult: initialResult,
      wasRepaired: false,
    };
  }
}

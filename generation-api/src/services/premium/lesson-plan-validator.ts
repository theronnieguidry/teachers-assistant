/**
 * Lesson Plan Validator Service
 *
 * Validates LessonPlanStructure for pedagogical quality and structural correctness.
 * Can auto-repair minor issues with one retry.
 *
 * Issue #17: High-Quality Lesson Plan Generation
 */

import { generateContent, type AIProviderConfig } from "../ai-provider.js";
import type {
  LessonPlanStructure,
  LessonPlanValidationResult,
  LessonPlanRequirements,
  ValidationIssue,
  LessonSectionType,
  Grade,
} from "../../types/premium.js";
import { getTotalDuration } from "./lesson-plan-planner.js";

/**
 * Required section types for a valid lesson plan
 */
const REQUIRED_SECTIONS: LessonSectionType[] = [
  "warmup",
  "instruction",
  "guided_practice",
  "independent_practice",
  "closure",
];

/**
 * Recommended time ranges per section type (in minutes)
 */
const SECTION_TIME_RANGES: Record<LessonSectionType, { min: number; max: number }> = {
  warmup: { min: 2, max: 7 },
  instruction: { min: 5, max: 15 },
  guided_practice: { min: 5, max: 15 },
  independent_practice: { min: 8, max: 25 },
  check_understanding: { min: 2, max: 7 },
  closure: { min: 2, max: 5 },
  extension: { min: 0, max: 10 },
};

/**
 * Grade-appropriate vocabulary checking (simplified)
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

/**
 * Estimate syllable count in a word (simple heuristic)
 */
function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned.length <= 3) return 1;

  const vowelGroups = cleaned.match(/[aeiouy]+/gi);
  if (!vowelGroups) return 1;

  let count = vowelGroups.length;
  if (cleaned.endsWith("e") && cleaned.length > 3) count--;
  if (cleaned.endsWith("le") && cleaned.length > 3) count++;

  return Math.max(1, count);
}

/**
 * Check if teacher script entries are present when required
 */
function checkTeacherScript(
  plan: LessonPlanStructure,
  requirements: LessonPlanRequirements
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!requirements.includeTeacherScript) {
    return issues;
  }

  for (const section of plan.sections) {
    if (!section.teacherScript || section.teacherScript.length === 0) {
      issues.push({
        severity: "error",
        field: `sections.${section.type}.teacherScript`,
        message: `Section "${section.title}" missing teacher script (required for novice teachers)`,
        suggestion: "Add teacherScript entries with 'say', 'do', 'if_struggle', and 'if_success' actions",
      });
    } else {
      // Check for at least one "say" action
      const hasSay = section.teacherScript.some((s) => s.action === "say");
      if (!hasSay) {
        issues.push({
          severity: "warning",
          field: `sections.${section.type}.teacherScript`,
          message: `Section "${section.title}" teacher script should include 'say' actions`,
          suggestion: "Add specific dialogue the teacher should use",
        });
      }
    }
  }

  return issues;
}

/**
 * Check section timing adds up correctly
 */
function checkTiming(
  plan: LessonPlanStructure,
  requirements: LessonPlanRequirements
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const totalDuration = getTotalDuration(plan);
  const targetDuration = requirements.lessonLength;

  // Allow 10% variance
  const minAllowed = Math.floor(targetDuration * 0.9);
  const maxAllowed = Math.ceil(targetDuration * 1.1);

  if (totalDuration < minAllowed) {
    issues.push({
      severity: "warning",
      field: "sections",
      message: `Total lesson time (${totalDuration} min) is less than target (${targetDuration} min)`,
      suggestion: `Add ${targetDuration - totalDuration} more minutes of content`,
    });
  } else if (totalDuration > maxAllowed) {
    issues.push({
      severity: "warning",
      field: "sections",
      message: `Total lesson time (${totalDuration} min) exceeds target (${targetDuration} min)`,
      suggestion: `Reduce content by ${totalDuration - targetDuration} minutes`,
    });
  }

  // Check individual section times
  for (const section of plan.sections) {
    const range = SECTION_TIME_RANGES[section.type];
    if (range) {
      if (section.durationMinutes < range.min) {
        issues.push({
          severity: "warning",
          field: `sections.${section.type}.durationMinutes`,
          message: `"${section.title}" is too short (${section.durationMinutes} min, minimum ${range.min} min)`,
          suggestion: "Add more activities to this section",
        });
      } else if (section.durationMinutes > range.max) {
        issues.push({
          severity: "warning",
          field: `sections.${section.type}.durationMinutes`,
          message: `"${section.title}" is too long (${section.durationMinutes} min, maximum ${range.max} min)`,
          suggestion: "Consider breaking into smaller segments",
        });
      }
    }
  }

  return issues;
}

/**
 * Check materials list
 */
function checkMaterials(plan: LessonPlanStructure): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!plan.materials || plan.materials.length === 0) {
    issues.push({
      severity: "error",
      field: "materials",
      message: "Lesson plan has no materials list",
      suggestion: "Add at least basic materials (paper, pencil)",
    });
    return issues;
  }

  // Check each material has a name
  for (let i = 0; i < plan.materials.length; i++) {
    const material = plan.materials[i];
    if (!material.name || material.name.trim() === "") {
      issues.push({
        severity: "error",
        field: `materials[${i}].name`,
        message: "Material missing name",
        suggestion: "Provide a name for each material",
      });
    }
  }

  return issues;
}

/**
 * Check differentiation options
 */
function checkDifferentiation(plan: LessonPlanStructure): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!plan.differentiation) {
    issues.push({
      severity: "warning",
      field: "differentiation",
      message: "Lesson plan missing differentiation options",
      suggestion: "Add strategies for struggling, advanced, and ELL students",
    });
    return issues;
  }

  if (!plan.differentiation.forStruggling || plan.differentiation.forStruggling.length === 0) {
    issues.push({
      severity: "warning",
      field: "differentiation.forStruggling",
      message: "No strategies for struggling students",
      suggestion: "Add accommodations for students who need extra support",
    });
  }

  if (!plan.differentiation.forAdvanced || plan.differentiation.forAdvanced.length === 0) {
    issues.push({
      severity: "warning",
      field: "differentiation.forAdvanced",
      message: "No strategies for advanced students",
      suggestion: "Add challenge activities for students ready for more",
    });
  }

  return issues;
}

/**
 * Check grade appropriateness of objective and descriptions
 */
function checkGradeAppropriateness(
  plan: LessonPlanStructure,
  grade: Grade
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const maxSyllables = GRADE_MAX_SYLLABLES[grade];

  // Check objective
  const objectiveWords = plan.metadata.objective.split(/\s+/);
  for (const word of objectiveWords) {
    const syllables = countSyllables(word);
    if (syllables > maxSyllables + 2) {
      issues.push({
        severity: "warning",
        field: "metadata.objective",
        message: `Complex word "${word}" in objective may be difficult for grade ${grade}`,
        suggestion: "Consider simpler language in the learning objective",
      });
      break; // Only report one complex word per field
    }
  }

  return issues;
}

/**
 * Main validation function
 */
export async function validateLessonPlan(
  plan: LessonPlanStructure,
  requirements: LessonPlanRequirements
): Promise<LessonPlanValidationResult> {
  const issues: ValidationIssue[] = [];

  // 1. Check required sections are present
  const presentSections = plan.sections.map((s) => s.type);
  for (const required of REQUIRED_SECTIONS) {
    if (!presentSections.includes(required)) {
      issues.push({
        severity: "error",
        field: "sections",
        message: `Missing required section: ${required}`,
        suggestion: `Add a ${required} section to the lesson plan`,
      });
    }
  }

  // 2. Check for single clear objective
  if (!plan.metadata.objective || plan.metadata.objective.trim().length < 10) {
    issues.push({
      severity: "error",
      field: "metadata.objective",
      message: "Lesson plan missing clear learning objective",
      suggestion: "Provide a specific, measurable learning objective",
    });
  }

  // 3. Check sections have required fields
  for (const section of plan.sections) {
    if (!section.title || section.title.trim() === "") {
      issues.push({
        severity: "error",
        field: `sections.${section.type}.title`,
        message: `Section ${section.type} missing title`,
        suggestion: "Add a descriptive title for this section",
      });
    }
    if (!section.activities || section.activities.length === 0) {
      issues.push({
        severity: "error",
        field: `sections.${section.type}.activities`,
        message: `Section "${section.title || section.type}" has no activities`,
        suggestion: "Add at least one activity to this section",
      });
    }
  }

  // 4. Check teacher script (if required)
  issues.push(...checkTeacherScript(plan, requirements));

  // 5. Check timing
  issues.push(...checkTiming(plan, requirements));

  // 6. Check materials
  issues.push(...checkMaterials(plan));

  // 7. Check differentiation
  issues.push(...checkDifferentiation(plan));

  // 8. Check grade appropriateness
  issues.push(...checkGradeAppropriateness(plan, requirements.grade));

  // Determine validity and repairability
  const errors = issues.filter((i) => i.severity === "error");
  const autoRepairable = errors.length > 0 && errors.length <= 3;

  return {
    valid: errors.length === 0,
    issues,
    autoRepairable,
  };
}

/**
 * Build repair prompt for lesson plan
 */
function buildRepairPrompt(
  plan: LessonPlanStructure,
  issues: ValidationIssue[]
): string {
  const issueList = issues
    .map((i, idx) => `${idx + 1}. [${i.field}] ${i.message} - ${i.suggestion}`)
    .join("\n");

  return `You are an expert curriculum designer fixing issues in a lesson plan.

## Current Plan (JSON)
${JSON.stringify(plan, null, 2)}

## Issues to Fix
${issueList}

## Instructions
1. Fix ALL the listed issues
2. Keep all other content unchanged
3. Return the complete fixed JSON
4. Ensure the JSON is valid and parseable

Return ONLY the fixed JSON, no explanation needed.`;
}

/**
 * Attempt to repair a plan using AI
 */
export async function attemptLessonPlanRepair(
  plan: LessonPlanStructure,
  issues: ValidationIssue[],
  aiConfig: AIProviderConfig
): Promise<LessonPlanStructure> {
  console.log(
    `[lesson-plan-validator] Attempting repair for ${issues.length} issues`
  );

  const prompt = buildRepairPrompt(plan, issues);

  const response = await generateContent(prompt, {
    ...aiConfig,
    maxTokens: 6000,
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
    const repairedPlan = JSON.parse(cleaned.trim()) as LessonPlanStructure;
    console.log("[lesson-plan-validator] Repair successful");
    return repairedPlan;
  } catch (error) {
    console.error("[lesson-plan-validator] Repair failed to produce valid JSON");
    throw new Error("Lesson plan repair failed to produce valid JSON");
  }
}

/**
 * Validate and optionally repair a plan
 */
export async function validateAndRepairLessonPlan(
  plan: LessonPlanStructure,
  requirements: LessonPlanRequirements,
  aiConfig: AIProviderConfig
): Promise<{
  plan: LessonPlanStructure;
  validationResult: LessonPlanValidationResult;
  wasRepaired: boolean;
}> {
  // Initial validation
  const initialResult = await validateLessonPlan(plan, requirements);

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
      "[lesson-plan-validator] Too many errors for auto-repair, returning as-is"
    );
    return {
      plan,
      validationResult: initialResult,
      wasRepaired: false,
    };
  }

  // Attempt repair
  try {
    const repairedPlan = await attemptLessonPlanRepair(
      plan,
      initialResult.issues.filter((i) => i.severity === "error"),
      aiConfig
    );

    // Re-validate repaired plan
    const revalidationResult = await validateLessonPlan(repairedPlan, requirements);

    return {
      plan: repairedPlan,
      validationResult: revalidationResult,
      wasRepaired: true,
    };
  } catch (error) {
    console.error("[lesson-plan-validator] Repair attempt failed:", error);
    return {
      plan,
      validationResult: initialResult,
      wasRepaired: false,
    };
  }
}

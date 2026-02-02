/**
 * Worksheet Planner Service
 *
 * Creates structured WorksheetPlan JSON from a teacher's prompt.
 * This is the first stage of the premium generation pipeline.
 */

import { generateContent, type AIProviderConfig } from "../ai-provider.js";
import {
  buildPlannerPrompt,
  type PlannerContext,
} from "../../prompts/premium-templates.js";
import type {
  WorksheetPlan,
  PremiumGenerationContext,
} from "../../types/premium.js";

export interface PlannerResult {
  plan: WorksheetPlan;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Parse JSON from AI response, handling common formatting issues
 */
function parseJsonResponse(content: string): WorksheetPlan {
  // Remove markdown code block wrappers if present
  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as WorksheetPlan;
  } catch (error) {
    // Try to extract JSON from the response if it contains extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as WorksheetPlan;
      } catch {
        // Fall through to error
      }
    }
    throw new Error(
      `Failed to parse worksheet plan JSON: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validate basic plan structure before returning
 */
function validateBasicStructure(plan: WorksheetPlan): void {
  if (!plan.version) {
    throw new Error("Plan missing version field");
  }
  if (!plan.metadata?.title) {
    throw new Error("Plan missing metadata.title");
  }
  if (!plan.structure?.header) {
    throw new Error("Plan missing structure.header");
  }
  if (!plan.structure?.sections || plan.structure.sections.length === 0) {
    throw new Error("Plan missing structure.sections");
  }

  // Check that sections have items
  for (const section of plan.structure.sections) {
    if (!section.items || section.items.length === 0) {
      throw new Error(`Section ${section.id} has no items`);
    }
    for (const item of section.items) {
      if (!item.id || !item.questionText || !item.correctAnswer) {
        throw new Error(
          `Item in section ${section.id} missing required fields (id, questionText, correctAnswer)`
        );
      }
    }
  }
}

/**
 * Count total questions across all sections
 */
export function countQuestions(plan: WorksheetPlan): number {
  return plan.structure.sections.reduce(
    (total, section) => total + section.items.length,
    0
  );
}

/**
 * Create a worksheet plan from the generation context
 */
export async function createWorksheetPlan(
  context: PremiumGenerationContext,
  aiConfig: AIProviderConfig
): Promise<PlannerResult> {
  const plannerContext: PlannerContext = {
    prompt: context.prompt,
    grade: context.grade,
    subject: context.subject,
    options: context.options,
    visualSettings: context.visualSettings,
    inspiration: context.inspiration,
  };

  const prompt = buildPlannerPrompt(plannerContext);

  console.log(
    `[worksheet-planner] Creating plan for ${context.grade} ${context.subject}`
  );
  const startTime = Date.now();

  const response = await generateContent(prompt, {
    ...aiConfig,
    maxTokens: 4096, // Plans are typically 1-2K tokens
  });

  console.log(
    `[worksheet-planner] AI response received in ${Date.now() - startTime}ms`
  );

  // Parse and validate the JSON response
  const plan = parseJsonResponse(response.content);

  // Basic structural validation
  validateBasicStructure(plan);

  // Ensure metadata matches context
  plan.metadata.grade = context.grade;
  plan.metadata.subject = context.subject;

  const questionCount = countQuestions(plan);
  console.log(
    `[worksheet-planner] Plan created: "${plan.metadata.title}" with ${questionCount} questions`
  );

  return {
    plan,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  };
}

/**
 * Create a simple fallback plan when AI generation fails
 * This ensures we never leave the user without output
 */
export function createFallbackPlan(
  context: PremiumGenerationContext
): WorksheetPlan {
  const questionCount = context.options.questionCount || 10;

  return {
    version: "1.0",
    metadata: {
      title: `${context.subject} Worksheet`,
      grade: context.grade,
      subject: context.subject,
      topic: context.prompt,
      learningObjectives: ["Practice fundamental skills", "Build confidence"],
      estimatedTime: "15-20 minutes",
    },
    structure: {
      header: {
        title: `${context.subject} Worksheet`,
        hasNameLine: true,
        hasDateLine: true,
        instructions: "Complete each question carefully. Show your work.",
      },
      sections: [
        {
          id: "s1",
          type: "questions",
          title: "Practice Problems",
          items: Array.from({ length: questionCount }, (_, i) => ({
            id: `q${i + 1}`,
            questionText: `[Question ${i + 1} - Unable to generate specific content]`,
            questionType: "short_answer" as const,
            correctAnswer: "[Answer to be determined]",
            explanation: "Review the question with your teacher.",
          })),
        },
      ],
    },
    style: {
      difficulty: context.options.difficulty || "medium",
      visualStyle: context.visualSettings.richness,
    },
  };
}

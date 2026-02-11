/**
 * Prompt Polisher - Uses Ollama to refine user prompts before generation
 *
 * This service takes a user's brief/casual prompt and transforms it into
 * a clear, detailed prompt optimized for AI content generation.
 */

import type { Grade } from "../types.js";
import {
  getResolvedLocalModel,
  getOllamaWarmupState,
  warmupLocalModel,
} from "./ollama-model-manager.js";

export interface PolishContext {
  prompt: string;
  grade: Grade;
  subject: string;
  format: "worksheet" | "lesson_plan" | "both";
  questionCount: number;
  difficulty: "easy" | "medium" | "hard";
  includeVisuals: boolean;
  inspirationTitles?: string[];
}

const POLISH_TIMEOUT = 5000; // 5 seconds

const GRADE_NAMES: Record<Grade, string> = {
  K: "Kindergarten",
  "1": "1st grade",
  "2": "2nd grade",
  "3": "3rd grade",
  "4": "4th grade",
  "5": "5th grade",
  "6": "6th grade",
};

/**
 * Build the prompt that instructs Ollama how to polish the user's request
 */
function buildPolishingPrompt(ctx: PolishContext): string {
  const inspirationNote = ctx.inspirationTitles?.length
    ? `\n- Reference materials provided: ${ctx.inspirationTitles.join(", ")}`
    : "";

  return `You are an expert prompt engineer for K-6 educational content.

Your task: Take the teacher's brief request and expand it into a clear, detailed prompt for AI worksheet/lesson generation.

Context:
- Grade level: ${GRADE_NAMES[ctx.grade]}
- Subject: ${ctx.subject}
- Creating: ${ctx.format === "both" ? "worksheet and lesson plan" : ctx.format}
- Number of questions: ${ctx.questionCount}
- Difficulty: ${ctx.difficulty}
- Include images: ${ctx.includeVisuals ? "yes" : "no"}${inspirationNote}

Teacher's request: "${ctx.prompt}"

Create an improved prompt that:
1. Clarifies the specific topic or skill to teach
2. Suggests age-appropriate question types and activities
3. Mentions real-world connections students can relate to
4. Keeps the teacher's original intent intact
5. Is specific enough for high-quality content generation

Return ONLY the improved prompt text (2-4 sentences). No explanations or formatting.`;
}

export interface PolishResult {
  polished: string;
  wasPolished: boolean;
  skipReason?: string;
}

/**
 * Polish a user's prompt using Ollama
 *
 * @param ctx - Context including the raw prompt and wizard settings
 * @returns The polished prompt with metadata, or the original if polishing fails/is disabled
 */
export async function polishPrompt(ctx: PolishContext): Promise<PolishResult> {
  // Check if polishing is explicitly disabled
  if (process.env.ENABLE_PROMPT_POLISHING === "false") {
    return {
      polished: ctx.prompt,
      wasPolished: false,
      skipReason: "disabled",
    };
  }

  // Skip if the prompt is already very detailed (300+ chars suggests user put significant effort in)
  if (ctx.prompt.length > 300) {
    console.log("Prompt polishing skipped: prompt already detailed");
    return {
      polished: ctx.prompt,
      wasPolished: false,
      skipReason: "already_detailed",
    };
  }

  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const configuredPolishModel = process.env.POLISH_MODEL;

  try {
    // Keep polish model aligned with backend-managed local generation model unless explicitly overridden.
    let model = configuredPolishModel;
    if (!model) {
      const warmupState = getOllamaWarmupState();
      if (!warmupState.localModelReady) {
        await warmupLocalModel();
      }
      model = getResolvedLocalModel();
    }

    const polishingPrompt = buildPolishingPrompt(ctx);

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: polishingPrompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(POLISH_TIMEOUT),
    });

    if (!response.ok) {
      console.log("Prompt polishing skipped: Ollama returned error");
      return {
        polished: ctx.prompt,
        wasPolished: false,
        skipReason: "ollama_error",
      };
    }

    const data = await response.json();
    const polished = data.response?.trim();

    // Validate the polished prompt
    if (polished && polished.length > 20 && polished.length < 1000) {
      console.log(`Prompt polished: "${ctx.prompt.substring(0, 50)}..." → "${polished.substring(0, 80)}..."`);
      return {
        polished,
        wasPolished: true,
      };
    }

    // Invalid response, use original
    console.log("Prompt polishing skipped: invalid response from Ollama");
    return {
      polished: ctx.prompt,
      wasPolished: false,
      skipReason: "invalid_response",
    };
  } catch (error) {
    // Fall back to original prompt
    // This handles: Ollama not installed, not running, timeout, network errors
    console.log("Prompt polishing skipped: Ollama unavailable");
    return {
      polished: ctx.prompt,
      wasPolished: false,
      skipReason: "ollama_unavailable",
    };
  }
}

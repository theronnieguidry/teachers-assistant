/**
 * Image Relevance Gate Service
 *
 * Filters and caps visual placements to ensure only instructionally useful
 * images are generated. Prevents wasteful "decorative" image generation.
 */

import type {
  ImagePlacement,
  VisualRichness,
  Grade,
} from "../../types/premium.js";

// ============================================
// Types
// ============================================

/**
 * Extended image purpose types for relevance filtering
 */
export type InstructionalPurpose =
  | "counting_support"
  | "phonics_cue"
  | "shape_diagram"
  | "word_problem_context"
  | "science_diagram_simple"
  | "matching_support"
  | "illustration"
  | "diagram"
  | "decoration";

export interface RelevanceCheckResult {
  approved: boolean;
  purpose: InstructionalPurpose;
  score: number; // 0-100 relevance score
  reason?: string;
}

export interface FilterResult {
  accepted: ImagePlacement[];
  rejected: ImagePlacement[];
  stats: {
    total: number;
    accepted: number;
    rejected: number;
    cap: number;
    byPurpose: Record<string, number>;
  };
}

export interface RelevanceContext {
  grade: Grade;
  subject: string;
  questionText?: string;
}

// ============================================
// Constants
// ============================================

/**
 * Allowed purposes for instructional images (MVP)
 * These purposes have educational value beyond decoration
 */
export const ALLOWED_PURPOSES: readonly InstructionalPurpose[] = [
  "counting_support",
  "phonics_cue",
  "shape_diagram",
  "word_problem_context",
  "science_diagram_simple",
  "matching_support",
  "diagram", // General diagrams are instructionally useful
];

/**
 * Caps per richness level
 */
export const RICHNESS_CAPS: Record<VisualRichness, number | "per-question"> = {
  minimal: 2,
  standard: 5,
  rich: "per-question",
};

/**
 * Maximum images for "rich" mode (per-question capped at reasonable limit)
 */
export const MAX_RICH_IMAGES = 10;

/**
 * Purpose priority scores (higher = more instructionally valuable)
 */
export const PURPOSE_SCORES: Record<InstructionalPurpose, number> = {
  counting_support: 95, // Directly supports math learning
  phonics_cue: 95, // Directly supports reading learning
  shape_diagram: 90, // Visual math aid
  science_diagram_simple: 90, // Visual science aid
  word_problem_context: 85, // Helps comprehension
  matching_support: 80, // Supports matching exercises
  diagram: 75, // General educational aid
  illustration: 50, // Supportive but not essential
  decoration: 10, // Lowest priority, usually filtered
};

/**
 * Keywords that indicate instructional purposes
 * Used to infer purpose from description
 */
const PURPOSE_KEYWORDS: Record<InstructionalPurpose, string[]> = {
  counting_support: [
    "count",
    "counting",
    "number",
    "objects",
    "groups",
    "sets",
    "how many",
    "addition",
    "subtraction",
  ],
  phonics_cue: [
    "letter",
    "sound",
    "phonics",
    "rhyme",
    "word",
    "spelling",
    "vowel",
    "consonant",
  ],
  shape_diagram: [
    "shape",
    "circle",
    "square",
    "triangle",
    "rectangle",
    "geometry",
    "angle",
  ],
  word_problem_context: [
    "story",
    "scenario",
    "problem",
    "situation",
    "real world",
    "example",
  ],
  science_diagram_simple: [
    "science",
    "diagram",
    "cycle",
    "plant",
    "animal",
    "weather",
    "body",
    "earth",
  ],
  matching_support: ["match", "matching", "connect", "pair", "same", "different"],
  diagram: ["diagram", "chart", "graph", "visual", "show", "demonstrate"],
  illustration: ["picture", "image", "illustration", "drawing"],
  decoration: ["decorate", "theme", "border", "background", "fun"],
};

// ============================================
// Main Functions
// ============================================

/**
 * Filter and cap visual placements based on richness level
 *
 * @param placements - Original visual placements from plan
 * @param richness - Visual richness setting
 * @param questionCount - Number of questions in worksheet
 * @returns Filtered placements that pass relevance gate
 */
export function filterAndCapPlacements(
  placements: ImagePlacement[],
  richness: VisualRichness,
  questionCount: number
): FilterResult {
  if (placements.length === 0) {
    return {
      accepted: [],
      rejected: [],
      stats: {
        total: 0,
        accepted: 0,
        rejected: 0,
        cap: getCap(richness, questionCount),
        byPurpose: {},
      },
    };
  }

  const cap = getCap(richness, questionCount);

  // Score and sort placements by instructional value
  const scored = placements.map((placement) => ({
    placement,
    result: checkRelevance(placement),
  }));

  // Sort by relevance score (highest first)
  scored.sort((a, b) => b.result.score - a.result.score);

  // Filter by relevance (must be approved) and cap
  const accepted: ImagePlacement[] = [];
  const rejected: ImagePlacement[] = [];
  const byPurpose: Record<string, number> = {};

  for (const { placement, result } of scored) {
    // Track purpose counts
    byPurpose[result.purpose] = (byPurpose[result.purpose] || 0) + 1;

    if (!result.approved) {
      rejected.push(placement);
      continue;
    }

    if (accepted.length >= cap) {
      rejected.push(placement);
      continue;
    }

    accepted.push(placement);
  }

  console.log(
    `[relevance-gate] Filtered ${placements.length} placements: ${accepted.length} accepted, ${rejected.length} rejected (cap: ${cap})`
  );

  return {
    accepted,
    rejected,
    stats: {
      total: placements.length,
      accepted: accepted.length,
      rejected: rejected.length,
      cap,
      byPurpose,
    },
  };
}

/**
 * Check if a single placement is instructionally relevant
 *
 * @param placement - Visual placement to check
 * @param context - Optional context for smarter filtering
 * @returns Relevance check result with score and reason
 */
export function checkRelevance(
  placement: ImagePlacement,
  context?: RelevanceContext
): RelevanceCheckResult {
  // Infer purpose from placement
  const inferredPurpose = inferPurpose(placement);
  const score = PURPOSE_SCORES[inferredPurpose];

  // Decoration is not approved unless explicitly allowed
  if (inferredPurpose === "decoration" || placement.purpose === "decoration") {
    return {
      approved: false,
      purpose: "decoration",
      score: PURPOSE_SCORES.decoration,
      reason: "Purely decorative images are filtered in premium mode",
    };
  }

  // Check if purpose is in allowed list
  const isAllowed = ALLOWED_PURPOSES.includes(inferredPurpose);

  // "illustration" is borderline - approve if score is high enough
  if (inferredPurpose === "illustration") {
    // Illustrations must have educational context
    const hasEducationalContext = hasEducationalKeywords(placement.description);
    return {
      approved: hasEducationalContext,
      purpose: "illustration",
      score: hasEducationalContext ? 60 : PURPOSE_SCORES.illustration,
      reason: hasEducationalContext
        ? "Illustration supports educational content"
        : "Illustration lacks clear educational purpose",
    };
  }

  return {
    approved: isAllowed,
    purpose: inferredPurpose,
    score,
    reason: isAllowed
      ? `Approved: ${inferredPurpose} is instructionally useful`
      : `Filtered: ${inferredPurpose} is not in allowed purposes list`,
  };
}

/**
 * Get the appropriate cap for a richness level
 */
export function getCap(richness: VisualRichness, questionCount: number): number {
  const cap = RICHNESS_CAPS[richness];

  if (cap === "per-question") {
    // For rich mode, allow one per question up to MAX_RICH_IMAGES
    return Math.min(questionCount, MAX_RICH_IMAGES);
  }

  return cap;
}

/**
 * Validate that placements respect richness caps
 * Returns true if within limits
 */
export function validatePlacementCount(
  placementCount: number,
  richness: VisualRichness,
  questionCount: number
): { valid: boolean; cap: number; message?: string } {
  const cap = getCap(richness, questionCount);
  const valid = placementCount <= cap;

  return {
    valid,
    cap,
    message: valid
      ? undefined
      : `Too many placements (${placementCount}) for richness level '${richness}' (cap: ${cap})`,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Infer the instructional purpose from placement data
 */
function inferPurpose(placement: ImagePlacement): InstructionalPurpose {
  // First, check if placement has an explicit purpose that matches our types
  const explicitPurpose = placement.purpose?.toLowerCase();
  if (explicitPurpose && PURPOSE_SCORES[explicitPurpose as InstructionalPurpose] !== undefined) {
    return explicitPurpose as InstructionalPurpose;
  }

  // Otherwise, infer from description
  const description = placement.description.toLowerCase();

  // Check each purpose's keywords
  for (const [purpose, keywords] of Object.entries(PURPOSE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        return purpose as InstructionalPurpose;
      }
    }
  }

  // Default based on explicit purpose if provided
  if (explicitPurpose === "illustration") return "illustration";
  if (explicitPurpose === "diagram") return "diagram";
  if (explicitPurpose === "decoration") return "decoration";

  // Fallback to illustration (mid-priority)
  return "illustration";
}

/**
 * Check if description contains educational keywords
 */
function hasEducationalKeywords(description: string): boolean {
  const educationalKeywords = [
    "count",
    "number",
    "letter",
    "word",
    "math",
    "science",
    "read",
    "learn",
    "example",
    "show",
    "demonstrate",
    "help",
    "understand",
    "explain",
    "practice",
    "exercise",
  ];

  const lower = description.toLowerCase();
  return educationalKeywords.some((keyword) => lower.includes(keyword));
}

/**
 * Sort placements by instructional priority
 * Higher priority = more instructionally valuable
 */
export function sortByPriority(placements: ImagePlacement[]): ImagePlacement[] {
  return [...placements].sort((a, b) => {
    const purposeA = inferPurpose(a);
    const purposeB = inferPurpose(b);
    return PURPOSE_SCORES[purposeB] - PURPOSE_SCORES[purposeA];
  });
}

/**
 * Get summary of filtered placements for logging/metadata
 */
export function getFilterSummary(result: FilterResult): string {
  const purposeBreakdown = Object.entries(result.stats.byPurpose)
    .map(([purpose, count]) => `${purpose}: ${count}`)
    .join(", ");

  return `Accepted ${result.stats.accepted}/${result.stats.total} placements (cap: ${result.stats.cap}). Purposes: ${purposeBreakdown || "none"}`;
}

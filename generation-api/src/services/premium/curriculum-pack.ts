/**
 * Curriculum Pack Service
 *
 * Loads and queries bundled curriculum packs for K-3 subjects.
 * Provides objective recommendations based on grade, subject, and difficulty.
 */

import { readFileSync } from "fs";
import { join } from "path";
import type {
  CurriculumPack,
  CurriculumUnit,
  CurriculumObjective,
  ObjectiveRecommendation,
} from "../../types/premium";

// Cache loaded curriculum packs
const packCache: Map<string, CurriculumPack> = new Map();

/**
 * Get the path to curriculum pack files
 */
function getCurriculumPackPath(filename: string): string {
  return join(__dirname, "../../curriculum-packs", filename);
}

/**
 * Map subject names to curriculum pack filenames
 */
const SUBJECT_TO_FILE: Record<string, string> = {
  math: "k3_math.json",
  mathematics: "k3_math.json",
  reading: "k3_reading.json",
  "language arts": "k3_reading.json",
  ela: "k3_reading.json",
  writing: "k3_writing.json",
  science: "k3_science.json",
  "social studies": "k3_social_studies.json",
  "social-studies": "k3_social_studies.json",
  history: "k3_social_studies.json",
  geography: "k3_social_studies.json",
};

/**
 * Normalize subject name to match our curriculum packs
 */
function normalizeSubject(subject: string): string {
  return subject.toLowerCase().trim();
}

/**
 * Normalize grade to single letter/number format
 */
function normalizeGrade(grade: string): string {
  const g = grade.toLowerCase().trim();
  // Handle "kindergarten", "K", "grade K", etc.
  if (g === "kindergarten" || g === "k" || g === "grade k") {
    return "K";
  }
  // Handle "1", "1st", "grade 1", "first", etc.
  const numMatch = g.match(/(\d)/);
  if (numMatch) {
    return numMatch[1];
  }
  // Handle word numbers
  const wordToNum: Record<string, string> = {
    first: "1",
    second: "2",
    third: "3",
    fourth: "4",
    fifth: "5",
    sixth: "6",
  };
  for (const [word, num] of Object.entries(wordToNum)) {
    if (g.includes(word)) {
      return num;
    }
  }
  return grade;
}

/**
 * Load a curriculum pack from disk (with caching)
 */
export function loadCurriculumPack(subject: string): CurriculumPack | null {
  const normalizedSubject = normalizeSubject(subject);
  const filename = SUBJECT_TO_FILE[normalizedSubject];

  if (!filename) {
    return null;
  }

  // Check cache first
  if (packCache.has(filename)) {
    return packCache.get(filename)!;
  }

  try {
    const filePath = getCurriculumPackPath(filename);
    const content = readFileSync(filePath, "utf-8");
    const pack: CurriculumPack = JSON.parse(content);
    packCache.set(filename, pack);
    return pack;
  } catch (error) {
    console.error(`Failed to load curriculum pack ${filename}:`, error);
    return null;
  }
}

/**
 * Get all available subjects
 */
export function getAvailableSubjects(): string[] {
  return ["Math", "Reading", "Writing", "Science", "Social Studies"];
}

/**
 * Get all grades covered by curriculum packs
 */
export function getAvailableGrades(): string[] {
  return ["K", "1", "2", "3"];
}

/**
 * Check if a subject has a curriculum pack
 */
export function hasSubjectPack(subject: string): boolean {
  const normalizedSubject = normalizeSubject(subject);
  return normalizedSubject in SUBJECT_TO_FILE;
}

/**
 * Get units for a specific grade within a curriculum pack
 */
export function getUnitsForGrade(
  subject: string,
  grade: string
): CurriculumUnit[] {
  const pack = loadCurriculumPack(subject);
  if (!pack) {
    return [];
  }

  const normalizedGrade = normalizeGrade(grade);
  return pack.units
    .filter((unit) => unit.grade === normalizedGrade)
    .sort((a, b) => a.sequence - b.sequence);
}

/**
 * Get all objectives for a grade and subject
 */
export function getObjectivesForGrade(
  subject: string,
  grade: string
): CurriculumObjective[] {
  const units = getUnitsForGrade(subject, grade);
  const objectives: CurriculumObjective[] = [];

  for (const unit of units) {
    objectives.push(...unit.objectives);
  }

  return objectives;
}

/**
 * Determine why an objective is recommended
 */
function getRecommendationReason(
  objective: CurriculumObjective,
  unit: CurriculumUnit,
  allObjectives: CurriculumObjective[]
): string {
  // Check if this is a foundational skill (no prereqs)
  if (objective.prereqs.length === 0) {
    return "Foundation skill";
  }

  // Check if prereqs are met (simplified - assumes all prior objectives completed)
  const prereqTexts = objective.prereqs.map((prereqId) => {
    const prereq = allObjectives.find((o) => o.id === prereqId);
    return prereq?.text?.split(" ").slice(0, 3).join(" ") || prereqId;
  });

  if (prereqTexts.length > 0) {
    return `Builds on ${prereqTexts[0]}...`;
  }

  // Check difficulty for challenge recommendation
  if (objective.difficulty === "challenge") {
    return "Challenge activity";
  }

  return `Part of ${unit.title}`;
}

/**
 * Get recommended learning objectives for a grade and subject
 *
 * @param grade - Grade level (K, 1, 2, 3, etc.)
 * @param subject - Subject name (Math, Reading, etc.)
 * @param difficulty - Optional difficulty filter
 * @param count - Number of recommendations to return (default: 3)
 * @returns Array of objective recommendations
 */
export function getRecommendedObjectives(
  grade: string,
  subject: string,
  difficulty?: "easy" | "standard" | "challenge",
  count: number = 3
): ObjectiveRecommendation[] {
  const pack = loadCurriculumPack(subject);
  if (!pack) {
    return [];
  }

  const normalizedGrade = normalizeGrade(grade);

  // Get all units for this grade
  const gradeUnits = pack.units
    .filter((unit) => unit.grade === normalizedGrade)
    .sort((a, b) => a.sequence - b.sequence);

  if (gradeUnits.length === 0) {
    return [];
  }

  // Collect all objectives with their unit context
  const allObjectives: Array<{
    objective: CurriculumObjective;
    unit: CurriculumUnit;
  }> = [];

  for (const unit of gradeUnits) {
    for (const objective of unit.objectives) {
      allObjectives.push({ objective, unit });
    }
  }

  // Flatten objectives for prereq lookup
  const flatObjectives = allObjectives.map((o) => o.objective);

  // Filter by difficulty if specified
  let filtered = allObjectives;
  if (difficulty) {
    filtered = allObjectives.filter(
      (o) => o.objective.difficulty === difficulty
    );
  }

  // If no matches after filtering, fall back to all objectives
  if (filtered.length === 0) {
    filtered = allObjectives;
  }

  // Sort by sequence (foundational first) and difficulty
  const difficultyOrder: Record<string, number> = {
    easy: 1,
    standard: 2,
    challenge: 3,
  };

  filtered.sort((a, b) => {
    // First by unit sequence
    if (a.unit.sequence !== b.unit.sequence) {
      return a.unit.sequence - b.unit.sequence;
    }
    // Then by difficulty
    const aDiff = difficultyOrder[a.objective.difficulty] || 2;
    const bDiff = difficultyOrder[b.objective.difficulty] || 2;
    return aDiff - bDiff;
  });

  // Take top N and convert to recommendations
  const recommendations: ObjectiveRecommendation[] = filtered
    .slice(0, count)
    .map(({ objective, unit }) => ({
      id: objective.id,
      text: objective.text,
      difficulty: objective.difficulty,
      estimatedMinutes: objective.estimatedMinutes,
      unitTitle: unit.title,
      whyRecommended: getRecommendationReason(objective, unit, flatObjectives),
      vocabulary: objective.vocabulary,
      activities: objective.activities,
      misconceptions: objective.misconceptions,
    }));

  return recommendations;
}

/**
 * Get a specific objective by ID
 */
export function getObjectiveById(
  subject: string,
  objectiveId: string
): (CurriculumObjective & { unitTitle: string }) | null {
  const pack = loadCurriculumPack(subject);
  if (!pack) {
    return null;
  }

  for (const unit of pack.units) {
    const objective = unit.objectives.find((o) => o.id === objectiveId);
    if (objective) {
      return {
        ...objective,
        unitTitle: unit.title,
      };
    }
  }

  return null;
}

/**
 * Search objectives by keyword
 */
export function searchObjectives(
  subject: string,
  keyword: string,
  grade?: string
): ObjectiveRecommendation[] {
  const pack = loadCurriculumPack(subject);
  if (!pack) {
    return [];
  }

  const normalizedKeyword = keyword.toLowerCase();
  const normalizedGrade = grade ? normalizeGrade(grade) : null;

  const results: ObjectiveRecommendation[] = [];

  for (const unit of pack.units) {
    // Skip if grade filter doesn't match
    if (normalizedGrade && unit.grade !== normalizedGrade) {
      continue;
    }

    for (const objective of unit.objectives) {
      // Search in objective text, vocabulary, and activities
      const searchText = [
        objective.text,
        ...objective.vocabulary,
        ...objective.activities,
      ]
        .join(" ")
        .toLowerCase();

      if (searchText.includes(normalizedKeyword)) {
        const flatObjectives = pack.units.flatMap((u) => u.objectives);
        results.push({
          id: objective.id,
          text: objective.text,
          difficulty: objective.difficulty,
          estimatedMinutes: objective.estimatedMinutes,
          unitTitle: unit.title,
          whyRecommended: getRecommendationReason(
            objective,
            unit,
            flatObjectives
          ),
          vocabulary: objective.vocabulary,
          activities: objective.activities,
          misconceptions: objective.misconceptions,
        });
      }
    }
  }

  return results;
}

/**
 * Clear the curriculum pack cache (useful for testing)
 */
export function clearPackCache(): void {
  packCache.clear();
}

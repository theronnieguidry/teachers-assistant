import type {
  CurriculumPack,
  CurriculumUnit,
  CurriculumObjective,
  MasteryState,
  LearnerMasteryData,
  LearnerObjectiveRecommendation,
  SubjectProgress,
  Grade,
} from "@/types";

// Import curriculum packs statically for bundling
import mathPack from "@/data/curriculum-packs/k3_math.json";
import readingPack from "@/data/curriculum-packs/k3_reading.json";
import writingPack from "@/data/curriculum-packs/k3_writing.json";
import sciencePack from "@/data/curriculum-packs/k3_science.json";
import socialStudiesPack from "@/data/curriculum-packs/k3_social_studies.json";

// Type assertion for imported JSON
const curriculumPacks: Record<string, CurriculumPack> = {
  Math: mathPack as unknown as CurriculumPack,
  Reading: readingPack as unknown as CurriculumPack,
  Writing: writingPack as unknown as CurriculumPack,
  Science: sciencePack as unknown as CurriculumPack,
  "Social Studies": socialStudiesPack as unknown as CurriculumPack,
};

/**
 * Get all curriculum packs
 */
export function getAllCurriculumPacks(): Record<string, CurriculumPack> {
  return curriculumPacks;
}

/**
 * Get a curriculum pack by subject
 */
export function getCurriculumPack(subject: string): CurriculumPack | null {
  return curriculumPacks[subject] || null;
}

/**
 * Get all subjects
 */
export function getSubjects(): string[] {
  return Object.keys(curriculumPacks);
}

/**
 * Get units for a specific subject and grade
 */
export function getUnitsForGrade(subject: string, grade: Grade): CurriculumUnit[] {
  const pack = getCurriculumPack(subject);
  if (!pack) return [];
  return pack.units.filter((unit) => unit.grade === grade);
}

/**
 * Get all objectives for a subject
 */
export function getObjectivesForSubject(subject: string): CurriculumObjective[] {
  const pack = getCurriculumPack(subject);
  if (!pack) return [];
  return pack.units.flatMap((unit) => unit.objectives);
}

/**
 * Get all objectives for a grade (across all subjects)
 */
export function getObjectivesForGrade(grade: Grade): { subject: string; unit: CurriculumUnit; objective: CurriculumObjective }[] {
  const results: { subject: string; unit: CurriculumUnit; objective: CurriculumObjective }[] = [];

  for (const [subject, pack] of Object.entries(curriculumPacks)) {
    for (const unit of pack.units) {
      if (unit.grade === grade) {
        for (const objective of unit.objectives) {
          results.push({ subject, unit, objective });
        }
      }
    }
  }

  return results;
}

/**
 * Get a specific objective by ID
 */
export function getObjectiveById(
  objectiveId: string
): { subject: string; unit: CurriculumUnit; objective: CurriculumObjective } | null {
  for (const [subject, pack] of Object.entries(curriculumPacks)) {
    for (const unit of pack.units) {
      const objective = unit.objectives.find((obj) => obj.id === objectiveId);
      if (objective) {
        return { subject, unit, objective };
      }
    }
  }
  return null;
}

/**
 * Get the next recommended objective for a learner
 * Considers: grade, prerequisites, mastery state, and subject balance
 */
export function getNextRecommendedObjective(
  grade: Grade,
  masteryData: LearnerMasteryData | null,
  preferredSubject?: string
): LearnerObjectiveRecommendation | null {
  const objectives = getObjectivesForGrade(grade);
  if (objectives.length === 0) return null;

  // Helper to get mastery state for an objective
  const getMasteryState = (objectiveId: string): MasteryState => {
    if (!masteryData?.objectives) return "not_started";
    return masteryData.objectives[objectiveId]?.state || "not_started";
  };

  // Helper to check if prerequisites are met
  const prerequisitesMet = (prereqs: string[]): boolean => {
    if (prereqs.length === 0) return true;
    return prereqs.every((prereqId) => {
      const state = getMasteryState(prereqId);
      return state === "mastered";
    });
  };

  // Priority 1: Find objectives that need review
  const needsReview = objectives.filter(
    ({ objective }) => getMasteryState(objective.id) === "needs_review"
  );
  if (needsReview.length > 0) {
    const item = needsReview[0];
    return {
      objective: item.objective,
      unit: item.unit,
      subject: item.subject,
      masteryState: "needs_review",
      whyRecommended: "This skill needs more practice based on your last check.",
    };
  }

  // Priority 2: Continue in-progress objectives
  const inProgress = objectives.filter(
    ({ objective }) => getMasteryState(objective.id) === "in_progress"
  );
  if (inProgress.length > 0) {
    const item = inProgress[0];
    return {
      objective: item.objective,
      unit: item.unit,
      subject: item.subject,
      masteryState: "in_progress",
      whyRecommended: "Continue where you left off.",
    };
  }

  // Priority 3: Find new objectives with met prerequisites
  // Prefer the user's preferred subject if specified
  let candidates = objectives.filter(
    ({ objective }) =>
      getMasteryState(objective.id) === "not_started" &&
      prerequisitesMet(objective.prereqs)
  );

  if (candidates.length === 0) return null;

  // Sort by preferred subject first, then by unit sequence
  if (preferredSubject) {
    candidates.sort((a, b) => {
      if (a.subject === preferredSubject && b.subject !== preferredSubject) return -1;
      if (b.subject === preferredSubject && a.subject !== preferredSubject) return 1;
      return a.unit.sequence - b.unit.sequence;
    });
  }

  const item = candidates[0];
  return {
    objective: item.objective,
    unit: item.unit,
    subject: item.subject,
    masteryState: "not_started",
    whyRecommended: `Ready to start a new ${item.subject.toLowerCase()} skill!`,
  };
}

/**
 * Get progress summary for a subject
 */
export function getSubjectProgress(
  subject: string,
  grade: Grade,
  masteryData: LearnerMasteryData | null
): SubjectProgress {
  const units = getUnitsForGrade(subject, grade);
  const objectives = units.flatMap((unit) => unit.objectives);

  let mastered = 0;
  let inProgress = 0;
  let needsReview = 0;
  let notStarted = 0;

  for (const obj of objectives) {
    const state = masteryData?.objectives?.[obj.id]?.state || "not_started";
    switch (state) {
      case "mastered":
        mastered++;
        break;
      case "in_progress":
        inProgress++;
        break;
      case "needs_review":
        needsReview++;
        break;
      default:
        notStarted++;
    }
  }

  const total = objectives.length;
  const percentComplete = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return {
    subject,
    totalObjectives: total,
    mastered,
    inProgress,
    needsReview,
    notStarted,
    percentComplete,
  };
}

/**
 * Get progress summary for all subjects at a grade level
 */
export function getAllSubjectProgress(
  grade: Grade,
  masteryData: LearnerMasteryData | null
): SubjectProgress[] {
  return getSubjects().map((subject) =>
    getSubjectProgress(subject, grade, masteryData)
  );
}

/**
 * Calculate mastery state from a quick check score
 */
export function calculateMasteryFromScore(score: number): MasteryState {
  if (score >= 80) return "mastered";
  if (score >= 50) return "in_progress";
  return "needs_review";
}

/**
 * Get objectives that are ready to learn (prerequisites met, not started)
 */
export function getReadyToLearnObjectives(
  grade: Grade,
  masteryData: LearnerMasteryData | null
): { subject: string; unit: CurriculumUnit; objective: CurriculumObjective }[] {
  const objectives = getObjectivesForGrade(grade);

  const getMasteryState = (objectiveId: string): MasteryState => {
    if (!masteryData?.objectives) return "not_started";
    return masteryData.objectives[objectiveId]?.state || "not_started";
  };

  const prerequisitesMet = (prereqs: string[]): boolean => {
    if (prereqs.length === 0) return true;
    return prereqs.every((prereqId) => {
      const state = getMasteryState(prereqId);
      return state === "mastered";
    });
  };

  return objectives.filter(
    ({ objective }) =>
      getMasteryState(objective.id) === "not_started" &&
      prerequisitesMet(objective.prereqs)
  );
}

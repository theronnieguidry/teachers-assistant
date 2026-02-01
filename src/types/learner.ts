import type { Grade, TeachingConfidence } from "./index";
import type { CurriculumObjective, CurriculumUnit } from "@shared/types";

// ============================================
// Mastery Tracking Types (Issue #18)
// ============================================

export type MasteryState = "not_started" | "in_progress" | "mastered" | "needs_review";

export type SessionDuration = 15 | 30 | 45 | 60;

// ============================================
// Learner Profile Types
// ============================================

export interface LearnerPreferences {
  favoriteSubjects: string[];
  sessionDuration: SessionDuration;
  visualLearner: boolean;
}

export interface LearnerProfile {
  learnerId: string;
  displayName: string;
  grade: Grade;
  avatarEmoji?: string;
  preferences: LearnerPreferences;
  adultConfidence: TeachingConfidence;
  createdAt: string; // ISO string for JSON serialization
  updatedAt: string;
}

export interface CreateLearnerProfileData {
  displayName: string;
  grade: Grade;
  avatarEmoji?: string;
  preferences?: Partial<LearnerPreferences>;
  adultConfidence?: TeachingConfidence;
}

// ============================================
// Mastery Data Types
// ============================================

export interface ObjectiveMastery {
  objectiveId: string;
  subject: string;
  state: MasteryState;
  lastScore?: number; // 0-100
  attempts: number;
  lastUpdated: string; // ISO string
  notes?: string; // Parent notes
}

export interface LearnerMasteryData {
  learnerId: string;
  objectives: Record<string, ObjectiveMastery>; // keyed by objectiveId
  lastSessionDate: string | null;
}

// ============================================
// Curriculum Pack Types (re-exported from shared)
// ============================================

export type { CurriculumObjective, CurriculumUnit, CurriculumPack } from "@shared/types";

// ============================================
// Quick Check Types (Phase 2)
// ============================================

export interface QuickCheckQuestion {
  questionId: string;
  questionText: string;
  options: string[];
  correctIndex: number;
}

export interface QuickCheckResult {
  resultId: string;
  learnerId: string;
  objectiveId: string;
  score: number; // 0-100
  totalQuestions: number;
  correctAnswers: number;
  items: { questionId: string; correct: boolean }[];
  createdAt: string;
}

// ============================================
// Recommendation Types
// ============================================

export interface LearnerObjectiveRecommendation {
  objective: CurriculumObjective;
  unit: CurriculumUnit;
  subject: string;
  masteryState: MasteryState;
  whyRecommended: string;
}

// ============================================
// Progress Summary Types
// ============================================

export interface SubjectProgress {
  subject: string;
  totalObjectives: number;
  mastered: number;
  inProgress: number;
  needsReview: number;
  notStarted: number;
  percentComplete: number;
}

export interface WeeklyProgress {
  objectivesWorkedOn: number;
  objectivesMastered: number;
  totalTimeMinutes: number;
  streakDays: number;
}

// ============================================
// Avatar Emoji Options
// ============================================

export const AVATAR_EMOJIS = [
  "🦁", "🐻", "🐰", "🦊", "🐼",
  "🦄", "🐸", "🦋", "🐝", "🦉",
  "🐢", "🦈", "🐙", "🦀", "🐬",
  "🌟", "🌈", "🎨", "📚", "✏️",
] as const;

export type AvatarEmoji = typeof AVATAR_EMOJIS[number];

// ============================================
// Subject Constants
// ============================================

export const SUBJECTS = [
  "Math",
  "Reading",
  "Writing",
  "Science",
  "Social Studies",
] as const;

export type Subject = typeof SUBJECTS[number];

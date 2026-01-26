import { invoke } from "@tauri-apps/api/core";
import { isTauriContext } from "./tauri-bridge";
import type {
  LearnerProfile,
  CreateLearnerProfileData,
  LearnerMasteryData,
  ObjectiveMastery,
  QuickCheckResult,
} from "@/types";

// ============================================
// Profile Functions
// ============================================

/**
 * Get all learner profiles
 */
export async function getLearnerProfiles(): Promise<LearnerProfile[]> {
  if (!isTauriContext()) {
    // Browser fallback - use localStorage
    const stored = localStorage.getItem("learner-profiles");
    return stored ? JSON.parse(stored) : [];
  }

  const result = await invoke<string>("get_learner_profiles");
  return JSON.parse(result);
}

/**
 * Save a learner profile (create or update)
 */
export async function saveLearnerProfile(profile: LearnerProfile): Promise<void> {
  if (!isTauriContext()) {
    // Browser fallback - use localStorage
    const profiles = await getLearnerProfiles();
    const index = profiles.findIndex((p) => p.learnerId === profile.learnerId);
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    localStorage.setItem("learner-profiles", JSON.stringify(profiles));
    return;
  }

  await invoke("save_learner_profile", {
    profile: JSON.stringify(profile),
  });
}

/**
 * Create a new learner profile
 */
export async function createLearnerProfile(
  data: CreateLearnerProfileData
): Promise<LearnerProfile> {
  const now = new Date().toISOString();
  const profile: LearnerProfile = {
    learnerId: crypto.randomUUID(),
    displayName: data.displayName,
    grade: data.grade,
    avatarEmoji: data.avatarEmoji || "🦁",
    preferences: {
      favoriteSubjects: data.preferences?.favoriteSubjects || [],
      sessionDuration: data.preferences?.sessionDuration || 30,
      visualLearner: data.preferences?.visualLearner ?? true,
    },
    adultConfidence: data.adultConfidence || "intermediate",
    createdAt: now,
    updatedAt: now,
  };

  await saveLearnerProfile(profile);
  return profile;
}

/**
 * Update an existing learner profile
 */
export async function updateLearnerProfile(
  learnerId: string,
  updates: Partial<Omit<LearnerProfile, "learnerId" | "createdAt">>
): Promise<LearnerProfile> {
  const profiles = await getLearnerProfiles();
  const profile = profiles.find((p) => p.learnerId === learnerId);

  if (!profile) {
    throw new Error(`Learner profile not found: ${learnerId}`);
  }

  const updated: LearnerProfile = {
    ...profile,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveLearnerProfile(updated);
  return updated;
}

/**
 * Delete a learner profile and all associated data
 */
export async function deleteLearnerProfile(learnerId: string): Promise<void> {
  if (!isTauriContext()) {
    // Browser fallback
    const profiles = await getLearnerProfiles();
    const filtered = profiles.filter((p) => p.learnerId !== learnerId);
    localStorage.setItem("learner-profiles", JSON.stringify(filtered));
    localStorage.removeItem(`learner-mastery-${learnerId}`);
    localStorage.removeItem(`learner-quickchecks-${learnerId}`);
    return;
  }

  await invoke("delete_learner_profile", { learnerId });
}

// ============================================
// Mastery Functions
// ============================================

/**
 * Get mastery data for a learner
 */
export async function getLearnerMastery(learnerId: string): Promise<LearnerMasteryData> {
  if (!isTauriContext()) {
    // Browser fallback
    const stored = localStorage.getItem(`learner-mastery-${learnerId}`);
    if (stored) return JSON.parse(stored);
    return {
      learnerId,
      objectives: {},
      lastSessionDate: null,
    };
  }

  const result = await invoke<string>("get_learner_mastery", { learnerId });
  return JSON.parse(result);
}

/**
 * Save mastery for a single objective
 */
export async function saveObjectiveMastery(
  learnerId: string,
  objectiveMastery: ObjectiveMastery
): Promise<void> {
  if (!isTauriContext()) {
    // Browser fallback
    const mastery = await getLearnerMastery(learnerId);
    mastery.objectives[objectiveMastery.objectiveId] = objectiveMastery;
    mastery.lastSessionDate = new Date().toISOString();
    localStorage.setItem(`learner-mastery-${learnerId}`, JSON.stringify(mastery));
    return;
  }

  await invoke("save_objective_mastery", {
    learnerId,
    objectiveMastery: JSON.stringify(objectiveMastery),
  });
}

/**
 * Save complete mastery data (bulk update)
 */
export async function saveLearnerMastery(
  learnerId: string,
  masteryData: LearnerMasteryData
): Promise<void> {
  if (!isTauriContext()) {
    // Browser fallback
    localStorage.setItem(`learner-mastery-${learnerId}`, JSON.stringify(masteryData));
    return;
  }

  await invoke("save_learner_mastery", {
    learnerId,
    masteryData: JSON.stringify(masteryData),
  });
}

/**
 * Update mastery state for an objective (convenience function)
 */
export async function updateObjectiveMasteryState(
  learnerId: string,
  objectiveId: string,
  subject: string,
  state: ObjectiveMastery["state"],
  score?: number
): Promise<void> {
  const mastery = await getLearnerMastery(learnerId);
  const existing = mastery.objectives[objectiveId];

  const updated: ObjectiveMastery = {
    objectiveId,
    subject,
    state,
    lastScore: score ?? existing?.lastScore,
    attempts: (existing?.attempts || 0) + (score !== undefined ? 1 : 0),
    lastUpdated: new Date().toISOString(),
    notes: existing?.notes,
  };

  await saveObjectiveMastery(learnerId, updated);
}

// ============================================
// Quick Check Functions (Phase 2)
// ============================================

/**
 * Get quick check history for a learner
 */
export async function getQuickCheckHistory(
  learnerId: string,
  objectiveId?: string
): Promise<QuickCheckResult[]> {
  if (!isTauriContext()) {
    // Browser fallback
    const stored = localStorage.getItem(`learner-quickchecks-${learnerId}`);
    if (!stored) return [];
    const history: QuickCheckResult[] = JSON.parse(stored);
    if (objectiveId) {
      return history.filter((h) => h.objectiveId === objectiveId);
    }
    return history;
  }

  const result = await invoke<string>("get_quick_check_history", {
    learnerId,
    objectiveId: objectiveId || null,
  });
  return JSON.parse(result);
}

/**
 * Save a quick check result
 */
export async function saveQuickCheckResult(
  learnerId: string,
  result: Omit<QuickCheckResult, "resultId" | "createdAt">
): Promise<QuickCheckResult> {
  const fullResult: QuickCheckResult = {
    ...result,
    resultId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  if (!isTauriContext()) {
    // Browser fallback
    const history = await getQuickCheckHistory(learnerId);
    history.push(fullResult);
    localStorage.setItem(`learner-quickchecks-${learnerId}`, JSON.stringify(history));
    return fullResult;
  }

  await invoke("save_quick_check_result", {
    learnerId,
    result: JSON.stringify(fullResult),
  });

  return fullResult;
}

// ============================================
// Active Learner (localStorage only)
// ============================================

const ACTIVE_LEARNER_KEY = "active-learner-id";

/**
 * Get the active learner ID from localStorage
 */
export function getActiveLearnerIdFromStorage(): string | null {
  return localStorage.getItem(ACTIVE_LEARNER_KEY);
}

/**
 * Save the active learner ID to localStorage
 */
export function setActiveLearnerIdToStorage(learnerId: string | null): void {
  if (learnerId) {
    localStorage.setItem(ACTIVE_LEARNER_KEY, learnerId);
  } else {
    localStorage.removeItem(ACTIVE_LEARNER_KEY);
  }
}

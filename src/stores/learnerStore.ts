import { create } from "zustand";
import type {
  LearnerProfile,
  CreateLearnerProfileData,
  LearnerMasteryData,
  ObjectiveMastery,
  MasteryState,
  LearnerObjectiveRecommendation,
  SubjectProgress,
  QuickCheckResult,
  QuickCheckResultItem,
} from "@/types";
import {
  getLearnerProfiles,
  createLearnerProfile as createProfile,
  updateLearnerProfile as updateProfile,
  deleteLearnerProfile as deleteProfile,
  getLearnerMastery,
  updateObjectiveMasteryState,
  getActiveLearnerIdFromStorage,
  setActiveLearnerIdToStorage,
  getQuickCheckHistory,
  saveQuickCheckResult,
} from "@/services/learner-storage";
import {
  getNextRecommendedObjective,
  getAllSubjectProgress,
  getSubjectProgress as getCurriculumSubjectProgress,
  calculateMasteryFromScore,
  calculateQuickCheckRecommendation,
  summarizeMissedCheckpoints,
} from "@/lib/curriculum";

interface LearnerState {
  // Profile state
  profiles: LearnerProfile[];
  activeLearnerId: string | null;
  isLoading: boolean;
  error: string | null;

  // Mastery state
  masteryData: LearnerMasteryData | null;
  isMasteryLoading: boolean;
  quickCheckHistory: QuickCheckResult[];
  isQuickCheckLoading: boolean;

  // Computed helpers (accessed via getState())
  getActiveProfile: () => LearnerProfile | null;
  getNextRecommendedObjective: (subject?: string) => LearnerObjectiveRecommendation | null;
  getSubjectProgress: (subject: string) => SubjectProgress | null;
  getAllSubjectProgress: () => SubjectProgress[];

  // Profile actions
  loadProfiles: () => Promise<void>;
  createProfile: (data: CreateLearnerProfileData) => Promise<LearnerProfile>;
  updateProfile: (
    learnerId: string,
    updates: Partial<Omit<LearnerProfile, "learnerId" | "createdAt">>
  ) => Promise<void>;
  deleteProfile: (learnerId: string) => Promise<void>;
  setActiveLearner: (learnerId: string | null) => void;

  // Mastery actions
  loadMastery: (learnerId: string) => Promise<void>;
  updateObjectiveMastery: (
    objectiveId: string,
    subject: string,
    state: MasteryState,
    score?: number
  ) => Promise<void>;
  markObjectiveStarted: (objectiveId: string, subject: string) => Promise<void>;
  markObjectiveMastered: (objectiveId: string, subject: string) => Promise<void>;
  markObjectiveNeedsReview: (objectiveId: string, subject: string) => Promise<void>;
  loadQuickCheckHistory: (objectiveId?: string) => Promise<void>;
  getLatestQuickCheck: (objectiveId: string) => QuickCheckResult | null;
  submitQuickCheck: (params: {
    objectiveId: string;
    subject: string;
    items: QuickCheckResultItem[];
  }) => Promise<QuickCheckResult>;

  // Utility actions
  clearError: () => void;
  reset: () => void;
}

export const useLearnerStore = create<LearnerState>()((set, get) => ({
  // Initial state
  profiles: [],
  activeLearnerId: getActiveLearnerIdFromStorage(),
  isLoading: false,
  error: null,
  masteryData: null,
  isMasteryLoading: false,
  quickCheckHistory: [],
  isQuickCheckLoading: false,

  // ============================================
  // Computed Helpers
  // ============================================

  getActiveProfile: () => {
    const { profiles, activeLearnerId } = get();
    if (!activeLearnerId) return null;
    return profiles.find((p) => p.learnerId === activeLearnerId) || null;
  },

  getNextRecommendedObjective: (subject?: string) => {
    const { masteryData } = get();
    const profile = get().getActiveProfile();
    if (!profile) return null;
    return getNextRecommendedObjective(profile.grade, masteryData, subject);
  },

  getSubjectProgress: (subject: string) => {
    const { masteryData } = get();
    const profile = get().getActiveProfile();
    if (!profile) return null;
    return getCurriculumSubjectProgress(subject, profile.grade, masteryData);
  },

  getAllSubjectProgress: () => {
    const { masteryData } = get();
    const profile = get().getActiveProfile();
    if (!profile) return [];
    return getAllSubjectProgress(profile.grade, masteryData);
  },

  // ============================================
  // Profile Actions
  // ============================================

  loadProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const profiles = await getLearnerProfiles();
      set({ profiles, isLoading: false });

      // If active learner was set, load their mastery data
      const { activeLearnerId } = get();
      if (activeLearnerId) {
        const exists = profiles.some((p) => p.learnerId === activeLearnerId);
        if (exists) {
          await get().loadMastery(activeLearnerId);
          await get().loadQuickCheckHistory();
        } else {
          // Active learner no longer exists, clear it
          set({
            activeLearnerId: null,
            masteryData: null,
            quickCheckHistory: [],
          });
          setActiveLearnerIdToStorage(null);
        }
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load profiles",
      });
    }
  },

  createProfile: async (data: CreateLearnerProfileData) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await createProfile(data);
      set((state) => ({
        profiles: [...state.profiles, profile],
        isLoading: false,
      }));

      // Automatically set as active if it's the first learner
      const { profiles } = get();
      if (profiles.length === 1) {
        get().setActiveLearner(profile.learnerId);
      }

      return profile;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to create profile",
      });
      throw error;
    }
  },

  updateProfile: async (learnerId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateProfile(learnerId, updates);
      set((state) => ({
        profiles: state.profiles.map((p) =>
          p.learnerId === learnerId ? updated : p
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to update profile",
      });
      throw error;
    }
  },

  deleteProfile: async (learnerId) => {
    set({ isLoading: true, error: null });
    try {
      await deleteProfile(learnerId);
      set((state) => ({
        profiles: state.profiles.filter((p) => p.learnerId !== learnerId),
        isLoading: false,
        // Clear active learner if deleted
        activeLearnerId:
          state.activeLearnerId === learnerId ? null : state.activeLearnerId,
        masteryData:
          state.activeLearnerId === learnerId ? null : state.masteryData,
        quickCheckHistory:
          state.activeLearnerId === learnerId ? [] : state.quickCheckHistory,
      }));

      // Update localStorage
      const { activeLearnerId } = get();
      if (!activeLearnerId) {
        setActiveLearnerIdToStorage(null);
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to delete profile",
      });
      throw error;
    }
  },

  setActiveLearner: (learnerId: string | null) => {
    setActiveLearnerIdToStorage(learnerId);
    set({ activeLearnerId: learnerId });

    // Load mastery data for the new active learner
    if (learnerId) {
      get().loadMastery(learnerId);
      get().loadQuickCheckHistory();
    } else {
      set({ masteryData: null, quickCheckHistory: [] });
    }
  },

  // ============================================
  // Mastery Actions
  // ============================================

  loadMastery: async (learnerId: string) => {
    set({ isMasteryLoading: true });
    try {
      const masteryData = await getLearnerMastery(learnerId);
      set({ masteryData, isMasteryLoading: false });
    } catch (error) {
      console.error("Failed to load mastery data:", error);
      set({
        masteryData: {
          learnerId,
          objectives: {},
          lastSessionDate: null,
        },
        isMasteryLoading: false,
      });
    }
  },

  updateObjectiveMastery: async (
    objectiveId: string,
    subject: string,
    state: MasteryState,
    score?: number
  ) => {
    const { activeLearnerId, masteryData } = get();
    if (!activeLearnerId) return;

    try {
      await updateObjectiveMasteryState(
        activeLearnerId,
        objectiveId,
        subject,
        state,
        score
      );

      // Update local state
      const existing = masteryData?.objectives?.[objectiveId];
      const updated: ObjectiveMastery = {
        objectiveId,
        subject,
        state,
        lastScore: score ?? existing?.lastScore,
        attempts: (existing?.attempts || 0) + (score !== undefined ? 1 : 0),
        lastUpdated: new Date().toISOString(),
        notes: existing?.notes,
      };

      set((s) => ({
        masteryData: s.masteryData
          ? {
              ...s.masteryData,
              objectives: {
                ...s.masteryData.objectives,
                [objectiveId]: updated,
              },
              lastSessionDate: new Date().toISOString(),
            }
          : {
              learnerId: activeLearnerId,
              objectives: { [objectiveId]: updated },
              lastSessionDate: new Date().toISOString(),
            },
      }));
    } catch (error) {
      console.error("Failed to update mastery:", error);
    }
  },

  markObjectiveStarted: async (objectiveId: string, subject: string) => {
    await get().updateObjectiveMastery(objectiveId, subject, "in_progress");
  },

  markObjectiveMastered: async (objectiveId: string, subject: string) => {
    await get().updateObjectiveMastery(objectiveId, subject, "mastered");
  },

  markObjectiveNeedsReview: async (objectiveId: string, subject: string) => {
    await get().updateObjectiveMastery(objectiveId, subject, "needs_review");
  },

  loadQuickCheckHistory: async (objectiveId?: string) => {
    const { activeLearnerId } = get();
    if (!activeLearnerId) {
      set({ quickCheckHistory: [], isQuickCheckLoading: false });
      return;
    }

    set({ isQuickCheckLoading: true });
    try {
      const quickCheckHistory = await getQuickCheckHistory(activeLearnerId, objectiveId);
      set({ quickCheckHistory, isQuickCheckLoading: false });
    } catch (error) {
      console.error("Failed to load quick check history:", error);
      set({ quickCheckHistory: [], isQuickCheckLoading: false });
    }
  },

  getLatestQuickCheck: (objectiveId: string) => {
    const { quickCheckHistory } = get();
    const matching = quickCheckHistory
      .filter((result) => result.objectiveId === objectiveId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    return matching[0] || null;
  },

  submitQuickCheck: async ({ objectiveId, subject, items }) => {
    const { activeLearnerId } = get();
    if (!activeLearnerId) {
      throw new Error("No active learner selected");
    }

    const totalQuestions = items.length;
    const correctAnswers = items.filter((item) => item.correct).length;
    const score =
      totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;
    const recommendation = calculateQuickCheckRecommendation(score);
    const wrongAnswerSummary = summarizeMissedCheckpoints(items);

    const savedResult = await saveQuickCheckResult(activeLearnerId, {
      learnerId: activeLearnerId,
      objectiveId,
      subject,
      score,
      totalQuestions,
      correctAnswers,
      items,
      recommendation,
      wrongAnswerSummary,
    });

    const masteryState = calculateMasteryFromScore(score);
    await get().updateObjectiveMastery(objectiveId, subject, masteryState, score);

    set((state) => ({
      quickCheckHistory: [...state.quickCheckHistory, savedResult].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));

    return savedResult;
  },

  // ============================================
  // Utility Actions
  // ============================================

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      profiles: [],
      activeLearnerId: null,
      isLoading: false,
        error: null,
        masteryData: null,
        isMasteryLoading: false,
        quickCheckHistory: [],
        isQuickCheckLoading: false,
      }),
}));

// Export convenience selector hooks
// NOTE: These hooks use shallow selectors to avoid infinite render loops.
// They select raw state and compute derived values, rather than calling
// store methods that return new objects on each render.
export const useActiveProfile = () => {
  const profiles = useLearnerStore((state) => state.profiles);
  const activeLearnerId = useLearnerStore((state) => state.activeLearnerId);
  if (!activeLearnerId) return null;
  return profiles.find((p) => p.learnerId === activeLearnerId) || null;
};

export const useNextRecommendedObjective = (subject?: string) => {
  const profiles = useLearnerStore((state) => state.profiles);
  const activeLearnerId = useLearnerStore((state) => state.activeLearnerId);
  const masteryData = useLearnerStore((state) => state.masteryData);

  const profile = activeLearnerId
    ? profiles.find((p) => p.learnerId === activeLearnerId)
    : null;

  if (!profile) return null;
  return getNextRecommendedObjective(profile.grade, masteryData, subject);
};

export const useSubjectProgress = (subject: string) => {
  const profiles = useLearnerStore((state) => state.profiles);
  const activeLearnerId = useLearnerStore((state) => state.activeLearnerId);
  const masteryData = useLearnerStore((state) => state.masteryData);

  const profile = activeLearnerId
    ? profiles.find((p) => p.learnerId === activeLearnerId)
    : null;

  if (!profile) return null;
  return getCurriculumSubjectProgress(subject, profile.grade, masteryData);
};

export const useAllSubjectProgress = () => {
  const profiles = useLearnerStore((state) => state.profiles);
  const activeLearnerId = useLearnerStore((state) => state.activeLearnerId);
  const masteryData = useLearnerStore((state) => state.masteryData);

  const profile = activeLearnerId
    ? profiles.find((p) => p.learnerId === activeLearnerId)
    : null;

  if (!profile) return [];
  return getAllSubjectProgress(profile.grade, masteryData);
};

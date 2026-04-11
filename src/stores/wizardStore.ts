import { create } from "zustand";
import type {
  Grade,
  InspirationItem,
  ProjectOptions,
  Project,
  ProjectWithContext,
  VisualSettings,
  GenerationMode,
  StudentProfileFlag,
  TeachingConfidence,
  LessonLength,
  ObjectiveRecommendation,
  LearnerProfile,
  RemediationContext,
  QuickCheckResult,
} from "@/types";
import { DEFAULT_VISUAL_SETTINGS } from "@/types";
import { useProjectStore } from "@/stores/projectStore";
import { useProjectContextStore } from "@/stores/projectContextStore";
import { useDesignPackStore } from "@/stores/designPackStore";
import { useInspirationStore } from "@/stores/inspirationStore";
import { useSettingsStore, type AiProvider } from "@/stores/settingsStore";
import {
  bulkUpsertInspirationItems,
  getInspirationItems,
} from "@/services/inspiration-storage";
import { mergeInspirationItems } from "@/lib/inspiration-merge";
import {
  getPreferredProjectType,
  getStoredObjectiveId,
} from "@/lib/project-context";

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

/** Compute the correct generation mode based on AI provider and output format */
function resolveGenerationMode(
  provider: AiProvider,
  format?: "worksheet" | "lesson_plan" | "both"
): GenerationMode {
  if (provider !== "premium") return "standard";
  return format === "lesson_plan" || format === "both"
    ? "premium_lesson_plan_pipeline"
    : "premium_plan_pipeline";
}

const LESSON_LENGTH_OPTIONS: LessonLength[] = [15, 30, 45, 60];
const KNOWN_SUBJECTS = ["Math", "Reading", "Writing", "Science", "Social Studies"] as const;

function normalizeLessonLength(minutes: number): LessonLength {
  return LESSON_LENGTH_OPTIONS.reduce((closest, option) =>
    Math.abs(option - minutes) < Math.abs(closest - minutes) ? option : closest
  );
}

function resolveSubjectFromUnitTitle(unitTitle: string): string {
  const trimmed = unitTitle.trim();
  const known = KNOWN_SUBJECTS.find((subject) =>
    new RegExp(`^${subject}\\b`, "i").test(trimmed)
  );
  if (known) return known;

  const beforeDash = trimmed.split("-")[0]?.trim();
  if (beforeDash) return beforeDash;

  return "Math";
}

function resolveObjectiveQuestionCount(
  format: "worksheet" | "lesson_plan" | "both",
  estimatedMinutes: number,
  objectiveDifficulty: ObjectiveRecommendation["difficulty"]
): number {
  const baseByFormat: Record<"worksheet" | "lesson_plan" | "both", number> = {
    worksheet: 10,
    lesson_plan: 6,
    both: 8,
  };

  const timeAdjustment =
    estimatedMinutes >= 60 ? 4 : estimatedMinutes >= 45 ? 2 : estimatedMinutes <= 20 ? -2 : 0;
  const difficultyAdjustment =
    objectiveDifficulty === "challenge" ? 2 : objectiveDifficulty === "easy" ? -1 : 0;
  const computed = baseByFormat[format] + timeAdjustment + difficultyAdjustment;

  return Math.max(5, Math.min(20, computed));
}

function resolveDefaultTargetProjectId(options?: {
  learnerId?: string | null;
  preferredType?: "learning_path" | "quick_create";
}): string | null {
  const availableProjects = Array.isArray(useProjectStore.getState().projects)
    ? useProjectStore.getState().projects
    : [];
  const allowedProjectIds = availableProjects.map((project) => project.id);
  return useProjectContextStore.getState().getLastUsedProjectId({
    learnerId: options?.learnerId,
    preferredType: options?.preferredType,
    allowedProjectIds,
  });
}

function applyProjectDefaultDesignPack(projectId: string | null): void {
  const context = projectId
    ? useProjectContextStore.getState().getContext(projectId)
    : null;
  useDesignPackStore
    .getState()
    .selectPack(context?.defaultDesignPackId || null, "project_default");
}

interface ClassDetails {
  grade: Grade;
  subject: string;
  format: "worksheet" | "lesson_plan" | "both";
  questionCount: number;
  includeVisuals: boolean;
  difficulty: "easy" | "medium" | "hard";
  includeAnswerKey: boolean;
  // Lesson plan specific options (Issue #17)
  lessonLength: LessonLength;
  studentProfile: StudentProfileFlag[];
  teachingConfidence: TeachingConfidence;
}

interface WizardState {
  isOpen: boolean;
  currentStep: WizardStep;
  prompt: string;
  title: string;
  objectiveId: string | null;
  learnerId: string | null;
  classDetails: ClassDetails | null;
  remediationContext: RemediationContext | null;
  selectedInspirationIds: string[];
  outputPath: string | null;

  // AI Provider state
  aiProvider: AiProvider;

  // Premium pipeline state
  generationMode: GenerationMode;
  visualSettings: VisualSettings;

  // Polished prompt state
  polishedPrompt: string | null;
  usePolishedPrompt: boolean;

  // Regeneration state
  regeneratingProjectId: string | null;

  // Target canonical project (Issue #20 follow-up)
  targetProjectId: string | null;

  // Generation state
  isGenerating: boolean;
  generationProgress: number;
  generationMessage: string;
  generationError: string | null;

  // Actions
  openWizard: (prompt: string) => void;
  openWizardForRegeneration: (project: Project) => Promise<void>;
  openWizardForProject: (project: ProjectWithContext) => void;
  openWizardFromObjective: (
    objective: ObjectiveRecommendation,
    learner: LearnerProfile,
    format?: "worksheet" | "lesson_plan" | "both"
  ) => void;
  openWizardForRemediation: (
    objective: ObjectiveRecommendation,
    learner: LearnerProfile,
    quickCheckResult: QuickCheckResult
  ) => void;
  openWizardOneOffForLearner: (learner: LearnerProfile, subject?: string) => void;
  closeWizard: () => void;
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPrompt: (prompt: string) => void;
  setTitle: (title: string) => void;
  setClassDetails: (details: ClassDetails) => void;
  setSelectedInspirationIds: (itemIds: string[]) => void;
  getSelectedInspirationItems: () => InspirationItem[];
  getEffectiveInspiration: () => InspirationItem[];
  setOutputPath: (path: string) => void;
  setAiProvider: (provider: AiProvider) => void;
  setGenerationMode: (mode: GenerationMode) => void;
  setVisualSettings: (settings: Partial<VisualSettings>) => void;
  setPolishedPrompt: (prompt: string | null) => void;
  setUsePolishedPrompt: (use: boolean) => void;
  setTargetProjectId: (projectId: string | null) => void;
  setGenerationState: (state: {
    isGenerating?: boolean;
    progress?: number;
    message?: string;
    error?: string | null;
  }) => void;
  reset: () => void;
}

const defaultClassDetails: ClassDetails = {
  grade: "2",
  subject: "",
  format: "both",
  questionCount: 10,
  includeVisuals: true,
  difficulty: "medium",
  includeAnswerKey: true,
  // Lesson plan defaults (Issue #17)
  lessonLength: 30,
  studentProfile: [],
  teachingConfidence: "intermediate",
};

export const useWizardStore = create<WizardState>((set, get) => ({
  isOpen: false,
  currentStep: 1,
  prompt: "",
  title: "",
  objectiveId: null,
  learnerId: null,
  classDetails: null,
  remediationContext: null,
  selectedInspirationIds: [],
  outputPath: null,
  aiProvider: "local",
  generationMode: "standard",
  visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
  polishedPrompt: null,
  usePolishedPrompt: true,
  regeneratingProjectId: null,
  targetProjectId: null,
  isGenerating: false,
  generationProgress: 0,
  generationMessage: "",
  generationError: null,

  openWizard: (prompt) => {
    // Generate title from prompt (first 50 chars)
    const title =
      prompt.length > 50 ? prompt.substring(0, 50) + "..." : prompt;
    // Use the user's default AI provider from settings
    const defaultProvider = useSettingsStore.getState().defaultAiProvider;
    const defaultMode = resolveGenerationMode(defaultProvider, defaultClassDetails.format);
    const targetProjectId = resolveDefaultTargetProjectId();
    applyProjectDefaultDesignPack(targetProjectId);
    set({
      isOpen: true,
      currentStep: 1,
      prompt,
      title,
      objectiveId: null,
      learnerId: null,
      classDetails: { ...defaultClassDetails },
      remediationContext: null,
      selectedInspirationIds: [],
      outputPath: null,
      aiProvider: defaultProvider,
      generationMode: defaultMode,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: null,
      targetProjectId,
      isGenerating: false,
      generationProgress: 0,
      generationMessage: "",
      generationError: null,
    });
  },

  openWizardForRegeneration: async (project) => {
    // Extract options with defaults
    const options = project.options || {};
    const objectiveId = getStoredObjectiveId(options);
    const projectContextStore = useProjectContextStore.getState();
    const projectContext = projectContextStore.getContext(project.id);
    applyProjectDefaultDesignPack(project.id);
    const localItems = await getInspirationItems();
    const localItemIds = new Set(localItems.map((item) => item.id));
    let selectedInspirationIds = projectContext?.selectedInspirationIds || [];

    const localSelectionAvailable =
      selectedInspirationIds.length > 0 &&
      selectedInspirationIds.every((itemId) => localItemIds.has(itemId));

    if (!localSelectionAvailable) {
      let inspiration = await useProjectStore.getState().fetchProjectInspiration(project.id);
      if (inspiration.length === 0 && project.inspiration && project.inspiration.length > 0) {
        inspiration = project.inspiration;
      }

      if (inspiration.length > 0) {
        const savedItems = await bulkUpsertInspirationItems(inspiration);
        selectedInspirationIds = savedItems.map((item) => item.id);
        projectContextStore.setSelectedInspirationIds(project.id, selectedInspirationIds);
      } else if (!localSelectionAvailable) {
        selectedInspirationIds = [];
      }
    }

    // Use the user's default AI provider from settings
    const defaultProvider = useSettingsStore.getState().defaultAiProvider;
    const projectFormat = (options.format as ClassDetails["format"]) || "both";
    const defaultMode = resolveGenerationMode(defaultProvider, projectFormat);

    set({
      isOpen: true,
      currentStep: 1,
      prompt: project.prompt,
      title: project.title,
      objectiveId,
      learnerId: projectContext?.learnerId || null,
      classDetails: {
        grade: project.grade,
        subject: project.subject,
        format: (options.format as ClassDetails["format"]) || "both",
        questionCount: options.questionCount || 10,
        includeVisuals: options.includeVisuals ?? true,
        difficulty: (options.difficulty as ClassDetails["difficulty"]) || "medium",
        includeAnswerKey: options.includeAnswerKey ?? true,
        // Lesson plan fields (Issue #17)
        lessonLength: (options.lessonLength as LessonLength) || 30,
        studentProfile: (options.studentProfile as StudentProfileFlag[]) || [],
        teachingConfidence: (options.teachingConfidence as TeachingConfidence) || "intermediate",
      },
      remediationContext: null,
      selectedInspirationIds,
      outputPath: project.outputPath || null,
      aiProvider: defaultProvider,
      generationMode: defaultMode,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: project.id,
      targetProjectId: project.id,
      isGenerating: false,
      generationProgress: 0,
      generationMessage: "",
      generationError: null,
    });
  },

  openWizardForProject: (project) => {
    const defaultProvider = useSettingsStore.getState().defaultAiProvider;
    const defaultMode = resolveGenerationMode(defaultProvider, "both");
    applyProjectDefaultDesignPack(project.id);

    set({
      isOpen: true,
      currentStep: 1,
      prompt: `Create new Grade ${project.grade} ${project.subject} materials for this project.`,
      title: `New ${project.subject} materials`,
      objectiveId: null,
      learnerId: project.learnerId || null,
      classDetails: {
        grade: project.grade,
        subject: project.subject,
        format: "both",
        questionCount: 10,
        includeVisuals: true,
        difficulty: "medium",
        includeAnswerKey: true,
        lessonLength: 30,
        studentProfile: [],
        teachingConfidence: "intermediate",
      },
      remediationContext: null,
      selectedInspirationIds: project.selectedInspirationIds || [],
      outputPath: project.outputPath || null,
      aiProvider: defaultProvider,
      generationMode: defaultMode,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: null,
      targetProjectId: project.id,
      isGenerating: false,
      generationProgress: 0,
      generationMessage: "",
      generationError: null,
    });
  },

  openWizardFromObjective: (objective, learner, format = "both") => {
    const subject = resolveSubjectFromUnitTitle(objective.unitTitle);
    const lessonLength = normalizeLessonLength(objective.estimatedMinutes);
    const questionCount = resolveObjectiveQuestionCount(
      format,
      objective.estimatedMinutes,
      objective.difficulty
    );

    // Create a deterministic prompt from objective context.
    const outputInstruction =
      format === "worksheet"
        ? `${questionCount} student questions`
        : format === "lesson_plan"
        ? `${lessonLength}-minute lesson plan with teacher guidance`
        : `${questionCount} questions plus a ${lessonLength}-minute lesson plan`;
    const prompt = `Create ${outputInstruction} for Grade ${learner.grade} ${subject} focused on: ${objective.text}.`;
    const title = objective.text.length > 50
      ? objective.text.substring(0, 50) + "..."
      : objective.text;

    // Map objective difficulty to wizard difficulty
    const difficultyMap: Record<string, "easy" | "medium" | "hard"> = {
      easy: "easy",
      standard: "medium",
      challenge: "hard",
    };

    // Use the user's default AI provider from settings
    const defaultProvider = useSettingsStore.getState().defaultAiProvider;
    const defaultMode = resolveGenerationMode(defaultProvider, format);
    const targetProjectId = resolveDefaultTargetProjectId({
      learnerId: learner.learnerId,
      preferredType: getPreferredProjectType(true),
    });
    applyProjectDefaultDesignPack(targetProjectId);

    set({
      isOpen: true,
      currentStep: 1,
      prompt,
      title,
      objectiveId: objective.id,
      learnerId: learner.learnerId,
      classDetails: {
        grade: learner.grade,
        subject: subject,
        format: format,
        questionCount,
        includeVisuals: true,
        difficulty: difficultyMap[objective.difficulty] || "medium",
        includeAnswerKey: format !== "lesson_plan",
        lessonLength,
        studentProfile: [],
        teachingConfidence: learner.adultConfidence,
      },
      remediationContext: null,
      selectedInspirationIds: [],
      outputPath: null,
      aiProvider: defaultProvider,
      generationMode: defaultMode,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: null,
      targetProjectId,
      isGenerating: false,
      generationProgress: 0,
      generationMessage: "",
      generationError: null,
    });
  },

  openWizardForRemediation: (objective, learner, quickCheckResult) => {
    const subject = resolveSubjectFromUnitTitle(objective.unitTitle);
    const title = `Remediation: ${objective.text}`.slice(0, 50);
    const defaultProvider = useSettingsStore.getState().defaultAiProvider;
    const targetProjectId = resolveDefaultTargetProjectId({
      learnerId: learner.learnerId,
      preferredType: getPreferredProjectType(true),
    });
    applyProjectDefaultDesignPack(targetProjectId);

    const remediationContext: RemediationContext = {
      objectiveId: objective.id,
      objectiveText: objective.text,
      subject,
      grade: learner.grade,
      score: quickCheckResult.score,
      wrongAnswerSummary: quickCheckResult.wrongAnswerSummary,
      missedCheckpoints: quickCheckResult.items
        .filter((item) => !item.correct)
        .map((item) => ({
          kind: item.kind,
          prompt: item.prompt,
          note: item.note,
        })),
    };

    set({
      isOpen: true,
      currentStep: 1,
      prompt: `Create a focused remediation worksheet for Grade ${learner.grade} ${subject} on ${objective.text}. Target the learner's missed areas and keep the support gentle and concrete.`,
      title,
      objectiveId: objective.id,
      learnerId: learner.learnerId,
      classDetails: {
        grade: learner.grade,
        subject,
        format: "worksheet",
        questionCount: 5,
        includeVisuals: false,
        difficulty: "easy",
        includeAnswerKey: true,
        lessonLength: 15,
        studentProfile: [],
        teachingConfidence: learner.adultConfidence,
      },
      remediationContext,
      selectedInspirationIds: [],
      outputPath: null,
      aiProvider: defaultProvider,
      generationMode: "remediation_pack",
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS, includeVisuals: false },
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: null,
      targetProjectId,
      isGenerating: false,
      generationProgress: 0,
      generationMessage: "",
      generationError: null,
    });
  },

  openWizardOneOffForLearner: (learner, subject) => {
    const resolvedSubject =
      subject || learner.preferences?.favoriteSubjects?.[0] || "Math";
    const lessonLength = normalizeLessonLength(learner.preferences?.sessionDuration || 30);
    const prompt = `Create a one-off worksheet for Grade ${learner.grade} ${resolvedSubject}.`;
    const title = `One-off ${resolvedSubject} worksheet`;

    const defaultProvider = useSettingsStore.getState().defaultAiProvider;
    const defaultMode = resolveGenerationMode(defaultProvider, "worksheet");
    const targetProjectId = resolveDefaultTargetProjectId({
      learnerId: learner.learnerId,
      preferredType: getPreferredProjectType(true),
    });
    applyProjectDefaultDesignPack(targetProjectId);

    set({
      isOpen: true,
      currentStep: 1,
      prompt,
      title,
      objectiveId: null,
      learnerId: learner.learnerId,
      classDetails: {
        grade: learner.grade,
        subject: resolvedSubject,
        format: "worksheet",
        questionCount: 10,
        includeVisuals: true,
        difficulty: "medium",
        includeAnswerKey: true,
        lessonLength,
        studentProfile: [],
        teachingConfidence: learner.adultConfidence || "intermediate",
      },
      remediationContext: null,
      selectedInspirationIds: [],
      outputPath: null,
      aiProvider: defaultProvider,
      generationMode: defaultMode,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: null,
      targetProjectId,
      isGenerating: false,
      generationProgress: 0,
      generationMessage: "",
      generationError: null,
    });
  },

  closeWizard: () => {
    set({ isOpen: false });
  },

  setStep: (step) => {
    set({ currentStep: step });
  },

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < 6) {
      set({ currentStep: (currentStep + 1) as WizardStep });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: (currentStep - 1) as WizardStep });
    }
  },

  setPrompt: (prompt) => {
    set({ prompt });
  },

  setTitle: (title) => {
    set({ title });
  },

  setClassDetails: (details) => {
    const { aiProvider, remediationContext } = get();
    const generationMode = remediationContext
      ? "remediation_pack"
      : resolveGenerationMode(aiProvider, details?.format);
    set({ classDetails: details, generationMode });
  },

  setSelectedInspirationIds: (itemIds) => {
    set({ selectedInspirationIds: Array.from(new Set(itemIds)) });
  },

  getSelectedInspirationItems: () => {
    const selectedIds = new Set(get().selectedInspirationIds);
    return useInspirationStore
      .getState()
      .items.filter((item) => selectedIds.has(item.id));
  },

  getEffectiveInspiration: () => {
    const selectedPack = useDesignPackStore.getState().getSelectedPack();
    return mergeInspirationItems(
      get().getSelectedInspirationItems(),
      selectedPack?.items || []
    );
  },

  setOutputPath: (path) => {
    set({ outputPath: path });
  },

  setAiProvider: (provider) => {
    const { classDetails, remediationContext } = get();
    const generationMode = remediationContext
      ? "remediation_pack"
      : resolveGenerationMode(provider, classDetails?.format);
    set({ aiProvider: provider, generationMode });
  },

  setGenerationMode: (mode) => {
    set({ generationMode: mode });
  },

  setVisualSettings: (settings) => {
    set((state) => ({
      visualSettings: { ...state.visualSettings, ...settings },
    }));
  },

  setPolishedPrompt: (prompt) => {
    set({ polishedPrompt: prompt });
  },

  setUsePolishedPrompt: (use) => {
    set({ usePolishedPrompt: use });
  },

  setTargetProjectId: (projectId) => {
    set({ targetProjectId: projectId });
  },

  setGenerationState: (state) => {
    set((current) => ({
      isGenerating: state.isGenerating ?? current.isGenerating,
      generationProgress: state.progress ?? current.generationProgress,
      generationMessage: state.message ?? current.generationMessage,
      generationError: state.error !== undefined ? state.error : current.generationError,
    }));
  },

  reset: () => {
    const defaultProvider = useSettingsStore.getState().defaultAiProvider;
    const defaultMode = resolveGenerationMode(defaultProvider);
    set({
      isOpen: false,
      currentStep: 1,
      prompt: "",
      title: "",
      objectiveId: null,
      learnerId: null,
      classDetails: null,
      remediationContext: null,
      selectedInspirationIds: [],
      outputPath: null,
      aiProvider: defaultProvider,
      generationMode: defaultMode,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: null,
      targetProjectId: null,
      isGenerating: false,
      generationProgress: 0,
      generationMessage: "",
      generationError: null,
    });
  },
}));

// Helper to get options for API
export function getProjectOptions(state: WizardState): ProjectOptions {
  const { classDetails } = state;
  if (!classDetails) return {};

  return {
    questionCount: classDetails.questionCount,
    includeVisuals: classDetails.includeVisuals,
    difficulty: classDetails.difficulty,
    format: classDetails.format,
    includeAnswerKey: classDetails.includeAnswerKey,
    // Lesson plan fields (Issue #17)
    lessonLength: classDetails.lessonLength,
    studentProfile: classDetails.studentProfile,
    teachingConfidence: classDetails.teachingConfidence,
  };
}

import { create } from "zustand";
import type {
  Grade,
  InspirationItem,
  ProjectOptions,
  Project,
  VisualSettings,
  GenerationMode,
  StudentProfileFlag,
  TeachingConfidence,
  LessonLength,
  ObjectiveRecommendation,
  LearnerProfile,
} from "@/types";
import { DEFAULT_VISUAL_SETTINGS } from "@/types";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore, type AiProvider } from "@/stores/settingsStore";

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
  classDetails: ClassDetails | null;
  selectedInspiration: InspirationItem[];
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

  // Target unified project (Issue #20 — project selection)
  targetProjectId: string | null;

  // Generation state
  isGenerating: boolean;
  generationProgress: number;
  generationMessage: string;
  generationError: string | null;

  // Actions
  openWizard: (prompt: string) => void;
  openWizardForRegeneration: (project: Project) => Promise<void>;
  openWizardFromObjective: (
    objective: ObjectiveRecommendation,
    learner: LearnerProfile,
    format?: "worksheet" | "lesson_plan" | "both"
  ) => void;
  closeWizard: () => void;
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPrompt: (prompt: string) => void;
  setTitle: (title: string) => void;
  setClassDetails: (details: ClassDetails) => void;
  setSelectedInspiration: (items: InspirationItem[]) => void;
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
  classDetails: null,
  selectedInspiration: [],
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
    set({
      isOpen: true,
      currentStep: 1,
      prompt,
      title,
      objectiveId: null,
      classDetails: { ...defaultClassDetails },
      selectedInspiration: [],
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

  openWizardForRegeneration: async (project) => {
    // Extract options with defaults
    const options = project.options || {};
    const objectiveId = typeof options.objectiveId === "string" ? options.objectiveId : null;

    // Try to fetch inspiration from junction table first (proper relational approach)
    let inspiration = await useProjectStore.getState().fetchProjectInspiration(project.id);

    // Fallback to JSONB for legacy projects or if junction table is empty
    if (inspiration.length === 0 && project.inspiration && project.inspiration.length > 0) {
      inspiration = project.inspiration;
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
      selectedInspiration: inspiration,
      outputPath: project.outputPath || null,
      aiProvider: defaultProvider,
      generationMode: defaultMode,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: project.id,
      targetProjectId: null,
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

    set({
      isOpen: true,
      currentStep: 1,
      prompt,
      title,
      objectiveId: objective.id,
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
      selectedInspiration: [],
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
    const { aiProvider } = get();
    const generationMode = resolveGenerationMode(aiProvider, details?.format);
    set({ classDetails: details, generationMode });
  },

  setSelectedInspiration: (items) => {
    set({ selectedInspiration: items });
  },

  setOutputPath: (path) => {
    set({ outputPath: path });
  },

  setAiProvider: (provider) => {
    const { classDetails } = get();
    const generationMode = resolveGenerationMode(provider, classDetails?.format);
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
      classDetails: null,
      selectedInspiration: [],
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

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
  classDetails: ClassDetails | null;
  selectedInspiration: InspirationItem[];
  outputPath: string | null;

  // AI Provider state
  aiProvider: AiProvider;
  ollamaModel: string | null;

  // Premium pipeline state
  generationMode: GenerationMode;
  visualSettings: VisualSettings;

  // Polished prompt state
  polishedPrompt: string | null;
  usePolishedPrompt: boolean;

  // Regeneration state
  regeneratingProjectId: string | null;

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
  setOllamaModel: (model: string | null) => void;
  setGenerationMode: (mode: GenerationMode) => void;
  setVisualSettings: (settings: Partial<VisualSettings>) => void;
  setPolishedPrompt: (prompt: string | null) => void;
  setUsePolishedPrompt: (use: boolean) => void;
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
  classDetails: null,
  selectedInspiration: [],
  outputPath: null,
  aiProvider: "local",
  ollamaModel: null,
  generationMode: "standard",
  visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
  polishedPrompt: null,
  usePolishedPrompt: true,
  regeneratingProjectId: null,
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
    // Use premium pipeline for premium provider
    const defaultMode: GenerationMode =
      defaultProvider === "premium" ? "premium_plan_pipeline" : "standard";
    set({
      isOpen: true,
      currentStep: 1,
      prompt,
      title,
      classDetails: { ...defaultClassDetails },
      selectedInspiration: [],
      outputPath: null,
      aiProvider: defaultProvider,
      ollamaModel: null,
      generationMode: defaultMode,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: null,
      isGenerating: false,
      generationProgress: 0,
      generationMessage: "",
      generationError: null,
    });
  },

  openWizardForRegeneration: async (project) => {
    // Extract options with defaults
    const options = project.options || {};

    // Try to fetch inspiration from junction table first (proper relational approach)
    let inspiration = await useProjectStore.getState().fetchProjectInspiration(project.id);

    // Fallback to JSONB for legacy projects or if junction table is empty
    if (inspiration.length === 0 && project.inspiration && project.inspiration.length > 0) {
      inspiration = project.inspiration;
    }

    // Use the user's default AI provider from settings
    const defaultProvider = useSettingsStore.getState().defaultAiProvider;
    // Use premium pipeline for premium provider
    const defaultMode: GenerationMode =
      defaultProvider === "premium" ? "premium_plan_pipeline" : "standard";

    set({
      isOpen: true,
      currentStep: 1,
      prompt: project.prompt,
      title: project.title,
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
      ollamaModel: null,
      generationMode: defaultMode,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: project.id,
      isGenerating: false,
      generationProgress: 0,
      generationMessage: "",
      generationError: null,
    });
  },

  openWizardFromObjective: (objective, learner, format = "both") => {
    // Create a prompt from the objective
    const prompt = `Create a ${objective.estimatedMinutes}-minute ${format === "worksheet" ? "practice worksheet" : "lesson"} about: ${objective.text}`;
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
    const defaultMode: GenerationMode =
      defaultProvider === "premium" ? "premium_plan_pipeline" : "standard";

    // Extract subject from unit title (first word typically)
    const subjectMatch = objective.unitTitle.match(/^(Math|Reading|Writing|Science|Social Studies)/i);
    const subject = subjectMatch ? subjectMatch[1] : objective.unitTitle.split(" ")[0];

    set({
      isOpen: true,
      currentStep: 1,
      prompt,
      title,
      classDetails: {
        grade: learner.grade,
        subject: subject,
        format: format,
        questionCount: format === "worksheet" ? 10 : 5,
        includeVisuals: true,
        difficulty: difficultyMap[objective.difficulty] || "medium",
        includeAnswerKey: true,
        lessonLength: objective.estimatedMinutes as LessonLength,
        studentProfile: [],
        teachingConfidence: learner.adultConfidence,
      },
      selectedInspiration: [],
      outputPath: null,
      aiProvider: defaultProvider,
      ollamaModel: null,
      generationMode: defaultMode,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: null,
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
    set({ classDetails: details });
  },

  setSelectedInspiration: (items) => {
    set({ selectedInspiration: items });
  },

  setOutputPath: (path) => {
    set({ outputPath: path });
  },

  setAiProvider: (provider) => {
    // Also update generation mode based on provider
    const generationMode: GenerationMode =
      provider === "premium" ? "premium_plan_pipeline" : "standard";
    set({ aiProvider: provider, generationMode });
  },

  setOllamaModel: (model) => {
    set({ ollamaModel: model });
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
    const defaultMode: GenerationMode =
      defaultProvider === "premium" ? "premium_plan_pipeline" : "standard";
    set({
      isOpen: false,
      currentStep: 1,
      prompt: "",
      title: "",
      classDetails: null,
      selectedInspiration: [],
      outputPath: null,
      aiProvider: defaultProvider,
      ollamaModel: null,
      generationMode: defaultMode,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: null,
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

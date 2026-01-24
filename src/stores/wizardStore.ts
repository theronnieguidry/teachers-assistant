import { create } from "zustand";
import type { Grade, InspirationItem, ProjectOptions, Project } from "@/types";

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

interface ClassDetails {
  grade: Grade;
  subject: string;
  format: "worksheet" | "lesson_plan" | "both";
  questionCount: number;
  includeVisuals: boolean;
  difficulty: "easy" | "medium" | "hard";
  includeAnswerKey: boolean;
}

type AiProvider = "claude" | "openai" | "ollama";

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
  openWizardForRegeneration: (project: Project) => void;
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
};

export const useWizardStore = create<WizardState>((set, get) => ({
  isOpen: false,
  currentStep: 1,
  prompt: "",
  title: "",
  classDetails: null,
  selectedInspiration: [],
  outputPath: null,
  aiProvider: "claude",
  ollamaModel: null,
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
    set({
      isOpen: true,
      currentStep: 1,
      prompt,
      title,
      classDetails: { ...defaultClassDetails },
      selectedInspiration: [],
      outputPath: null,
      aiProvider: "claude",
      ollamaModel: null,
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: null,
      isGenerating: false,
      generationProgress: 0,
      generationMessage: "",
      generationError: null,
    });
  },

  openWizardForRegeneration: (project) => {
    // Extract options with defaults
    const options = project.options || {};
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
      },
      selectedInspiration: project.inspiration || [],
      outputPath: project.outputPath || null,
      aiProvider: "claude",
      ollamaModel: null,
      polishedPrompt: null,
      usePolishedPrompt: true,
      regeneratingProjectId: project.id,
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
    set({ aiProvider: provider });
  },

  setOllamaModel: (model) => {
    set({ ollamaModel: model });
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
    set({
      isOpen: false,
      currentStep: 1,
      prompt: "",
      title: "",
      classDetails: null,
      selectedInspiration: [],
      outputPath: null,
      aiProvider: "claude",
      ollamaModel: null,
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
  };
}

import { create } from "zustand";
import type { Grade, InspirationItem, ProjectOptions } from "@/types";

type WizardStep = 1 | 2 | 3 | 4;

interface ClassDetails {
  grade: Grade;
  subject: string;
  format: "worksheet" | "lesson_plan" | "both";
  questionCount: number;
  includeVisuals: boolean;
  difficulty: "easy" | "medium" | "hard";
  includeAnswerKey: boolean;
}

interface WizardState {
  isOpen: boolean;
  currentStep: WizardStep;
  prompt: string;
  title: string;
  classDetails: ClassDetails | null;
  selectedInspiration: InspirationItem[];
  outputPath: string | null;

  // Generation state
  isGenerating: boolean;
  generationProgress: number;
  generationMessage: string;
  generationError: string | null;

  // Actions
  openWizard: (prompt: string) => void;
  closeWizard: () => void;
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPrompt: (prompt: string) => void;
  setTitle: (title: string) => void;
  setClassDetails: (details: ClassDetails) => void;
  setSelectedInspiration: (items: InspirationItem[]) => void;
  setOutputPath: (path: string) => void;
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
    if (currentStep < 4) {
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

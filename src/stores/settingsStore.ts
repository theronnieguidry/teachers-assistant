import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AiProvider = "claude" | "openai" | "ollama";

interface SettingsState {
  defaultAiProvider: AiProvider;
  setDefaultAiProvider: (provider: AiProvider) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultAiProvider: "ollama", // Default to free option
      setDefaultAiProvider: (provider) => set({ defaultAiProvider: provider }),
    }),
    { name: "ta-settings" }
  )
);

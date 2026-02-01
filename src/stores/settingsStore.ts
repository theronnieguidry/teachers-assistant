import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";

// User-facing provider types (not technical model names)
export type AiProvider = "premium" | "local";

// Legacy provider types for migration
type LegacyAiProvider = "claude" | "openai" | "ollama";

interface SettingsState {
  defaultAiProvider: AiProvider;
  setDefaultAiProvider: (provider: AiProvider) => void;
}

// Custom storage adapter that handles migration from legacy provider values
const migratingStorage: PersistStorage<SettingsState> = {
  getItem: (name: string): StorageValue<SettingsState> | null => {
    const str = localStorage.getItem(name);
    if (!str) return null;

    try {
      const parsed = JSON.parse(str);
      // Migrate legacy provider values
      if (parsed.state?.defaultAiProvider) {
        const legacy = parsed.state.defaultAiProvider as LegacyAiProvider | AiProvider;
        if (legacy === "claude" || legacy === "openai") {
          parsed.state.defaultAiProvider = "premium";
        } else if (legacy === "ollama") {
          parsed.state.defaultAiProvider = "local";
        }
      }
      return parsed;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<SettingsState>) => {
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultAiProvider: "local", // Default to free option
      setDefaultAiProvider: (provider) => set({ defaultAiProvider: provider }),
    }),
    {
      name: "ta-settings",
      storage: migratingStorage,
    }
  )
);

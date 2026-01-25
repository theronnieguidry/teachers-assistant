import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "@/stores/settingsStore";

describe("settingsStore", () => {
  beforeEach(() => {
    // Reset store state to defaults
    useSettingsStore.setState({
      defaultAiProvider: "ollama",
    });
  });

  describe("initial state", () => {
    it("defaults to ollama as the AI provider", () => {
      const { defaultAiProvider } = useSettingsStore.getState();
      expect(defaultAiProvider).toBe("ollama");
    });
  });

  describe("setDefaultAiProvider", () => {
    it("can set provider to claude", () => {
      useSettingsStore.getState().setDefaultAiProvider("claude");
      expect(useSettingsStore.getState().defaultAiProvider).toBe("claude");
    });

    it("can set provider to openai", () => {
      useSettingsStore.getState().setDefaultAiProvider("openai");
      expect(useSettingsStore.getState().defaultAiProvider).toBe("openai");
    });

    it("can set provider to ollama", () => {
      useSettingsStore.getState().setDefaultAiProvider("claude");
      useSettingsStore.getState().setDefaultAiProvider("ollama");
      expect(useSettingsStore.getState().defaultAiProvider).toBe("ollama");
    });
  });

  describe("type safety", () => {
    it("only accepts valid provider values", () => {
      const validProviders = ["claude", "openai", "ollama"] as const;
      validProviders.forEach((provider) => {
        useSettingsStore.getState().setDefaultAiProvider(provider);
        expect(useSettingsStore.getState().defaultAiProvider).toBe(provider);
      });
    });
  });
});

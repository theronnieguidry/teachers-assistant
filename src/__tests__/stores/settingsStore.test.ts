import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "@/stores/settingsStore";

describe("settingsStore", () => {
  beforeEach(() => {
    // Reset store state to defaults
    useSettingsStore.setState({
      defaultAiProvider: "local",
    });
  });

  describe("initial state", () => {
    it("defaults to local as the AI provider", () => {
      const { defaultAiProvider } = useSettingsStore.getState();
      expect(defaultAiProvider).toBe("local");
    });
  });

  describe("setDefaultAiProvider", () => {
    it("can set provider to premium", () => {
      useSettingsStore.getState().setDefaultAiProvider("premium");
      expect(useSettingsStore.getState().defaultAiProvider).toBe("premium");
    });

    it("can set provider to local", () => {
      useSettingsStore.getState().setDefaultAiProvider("premium");
      useSettingsStore.getState().setDefaultAiProvider("local");
      expect(useSettingsStore.getState().defaultAiProvider).toBe("local");
    });
  });

  describe("type safety", () => {
    it("only accepts valid provider values", () => {
      const validProviders = ["premium", "local"] as const;
      validProviders.forEach((provider) => {
        useSettingsStore.getState().setDefaultAiProvider(provider);
        expect(useSettingsStore.getState().defaultAiProvider).toBe(provider);
      });
    });
  });
});

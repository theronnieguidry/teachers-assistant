import { describe, it, expect, beforeEach } from "vitest";
import { isHostedApiBaseUrl, useSettingsStore } from "@/stores/settingsStore";

describe("settingsStore", () => {
  beforeEach(() => {
    // Reset store state to defaults
    useSettingsStore.setState({
      defaultAiProvider: "local",
      apiEndpointPreset: "local",
      customApiEndpoint: "",
      allowPremiumOnLocalDev: false,
    });
  });

  describe("initial state", () => {
    it("defaults to local as the AI provider", () => {
      const { defaultAiProvider, apiEndpointPreset, customApiEndpoint } =
        useSettingsStore.getState();
      expect(defaultAiProvider).toBe("local");
      expect(apiEndpointPreset).toBe("local");
      expect(customApiEndpoint).toBe("");
      expect(useSettingsStore.getState().getResolvedApiBaseUrl()).toBe(
        "http://localhost:3001"
      );
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

  describe("endpoint settings", () => {
    it("resolves a custom endpoint and normalizes trailing slash", () => {
      useSettingsStore.getState().setApiEndpointPreset("custom");
      useSettingsStore
        .getState()
        .setCustomApiEndpoint("https://staging.example.com/");

      expect(useSettingsStore.getState().getResolvedApiBaseUrl()).toBe(
        "https://staging.example.com"
      );
    });

    it("falls back to localhost when custom endpoint is empty", () => {
      useSettingsStore.getState().setApiEndpointPreset("custom");
      useSettingsStore.getState().setCustomApiEndpoint("   ");

      expect(useSettingsStore.getState().getResolvedApiBaseUrl()).toBe(
        "http://localhost:3001"
      );
    });
  });

  describe("hosted endpoint detection", () => {
    it("detects hosted https endpoint", () => {
      expect(isHostedApiBaseUrl("https://api.example.com")).toBe(true);
    });

    it("detects local endpoints as unhosted", () => {
      expect(isHostedApiBaseUrl("http://localhost:3001")).toBe(false);
      expect(isHostedApiBaseUrl("https://localhost:3001")).toBe(false);
    });
  });
});

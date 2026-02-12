import { beforeEach, describe, expect, it } from "vitest";
import { getApiBaseUrl, resolveApiUrl } from "@/services/api-endpoint-resolver";
import { useSettingsStore } from "@/stores/settingsStore";

describe("api-endpoint-resolver", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      defaultAiProvider: "local",
      apiEndpointPreset: "local",
      customApiEndpoint: "",
      allowPremiumOnLocalDev: false,
    });
  });

  it("uses the local default endpoint", () => {
    expect(getApiBaseUrl()).toBe("http://localhost:3001");
    expect(resolveApiUrl("/health")).toBe("http://localhost:3001/health");
  });

  it("uses custom endpoint from runtime settings", () => {
    useSettingsStore.getState().setApiEndpointPreset("custom");
    useSettingsStore.getState().setCustomApiEndpoint("https://api.school.test");

    expect(getApiBaseUrl()).toBe("https://api.school.test");
    expect(resolveApiUrl("checkout/packs")).toBe(
      "https://api.school.test/checkout/packs"
    );
  });
});

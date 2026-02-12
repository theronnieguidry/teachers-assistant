import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EndpointSettingsDialog } from "@/components/settings/EndpointSettingsDialog";
import { useSettingsStore } from "@/stores/settingsStore";

describe("EndpointSettingsDialog", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      defaultAiProvider: "local",
      apiEndpointPreset: "local",
      customApiEndpoint: "",
      allowPremiumOnLocalDev: false,
    });
  });

  it("shows local diagnostics by default", () => {
    render(<EndpointSettingsDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByText("Generation API Endpoint")).toBeInTheDocument();
    expect(screen.getByTestId("endpoint-diagnostics")).toHaveTextContent(
      "http://localhost:3001"
    );
    expect(screen.getByTestId("endpoint-diagnostics")).toHaveTextContent(
      "Local/Unhosted"
    );
  });

  it("shows custom endpoint input when custom preset is selected", () => {
    useSettingsStore.setState({
      apiEndpointPreset: "custom",
      customApiEndpoint: "https://api.example.com",
    });

    render(<EndpointSettingsDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByLabelText("Custom API Base URL")).toHaveValue(
      "https://api.example.com"
    );
  });
});

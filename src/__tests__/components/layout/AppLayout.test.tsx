import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppLayout } from "@/components/layout/AppLayout";

// Mock tauri-bridge
const mockCheckOllamaStatus = vi.fn();
vi.mock("@/services/tauri-bridge", () => ({
  checkOllamaStatus: () => mockCheckOllamaStatus(),
}));

// Mock child components to isolate AppLayout tests
vi.mock("@/components/layout/Header", () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock("@/components/layout/Sidebar", () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

// Mock OllamaSetup to capture open state
const mockOnOpenChange = vi.fn();
vi.mock("@/components/settings", () => ({
  OllamaSetup: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    // Store the callback for testing
    mockOnOpenChange.mockImplementation(onOpenChange);
    return open ? (
      <div data-testid="ollama-setup-dialog" role="dialog">
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null;
  },
}));

describe("AppLayout", () => {
  const OLLAMA_SETUP_SEEN_KEY = "ta-ollama-setup-seen";

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("basic rendering", () => {
    it("renders Header component", () => {
      mockCheckOllamaStatus.mockRejectedValue(new Error("Not in Tauri"));

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.getByTestId("header")).toBeInTheDocument();
    });

    it("renders Sidebar component", () => {
      mockCheckOllamaStatus.mockRejectedValue(new Error("Not in Tauri"));

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    });

    it("renders main content area with children", () => {
      mockCheckOllamaStatus.mockRejectedValue(new Error("Not in Tauri"));

      render(
        <AppLayout>
          <div data-testid="child-content">Child Content</div>
        </AppLayout>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.getByRole("main")).toContainElement(screen.getByTestId("child-content"));
    });

    it("applies correct layout structure", () => {
      mockCheckOllamaStatus.mockRejectedValue(new Error("Not in Tauri"));

      const { container } = render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      // Check for flex layout structure
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveClass("min-h-screen", "flex", "flex-col");
    });
  });

  describe("first-run Ollama setup", () => {
    it("shows Ollama setup when not installed on first run", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: false,
        running: false,
        models: [],
      });

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("ollama-setup-dialog")).toBeInTheDocument();
      });
    });

    it("shows Ollama setup when installed but no models on first run", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: true,
        models: [],
      });

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("ollama-setup-dialog")).toBeInTheDocument();
      });
    });

    it("does not show Ollama setup when installed with models", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: true,
        models: ["llama3.2"],
      });

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      // Wait a bit to ensure the effect has run
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(screen.queryByTestId("ollama-setup-dialog")).not.toBeInTheDocument();
    });

    it("does not show Ollama setup if user has already seen it", async () => {
      localStorage.setItem(OLLAMA_SETUP_SEEN_KEY, "true");

      mockCheckOllamaStatus.mockResolvedValue({
        installed: false,
        running: false,
        models: [],
      });

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      // Wait a bit to ensure the effect has run
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(screen.queryByTestId("ollama-setup-dialog")).not.toBeInTheDocument();
      // Should not even call checkOllamaStatus when setup was already seen
      expect(mockCheckOllamaStatus).not.toHaveBeenCalled();
    });

    it("does not show Ollama setup when check fails (non-Tauri context)", async () => {
      mockCheckOllamaStatus.mockRejectedValue(new Error("Not in Tauri context"));

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      // Wait a bit to ensure the effect has run
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(screen.queryByTestId("ollama-setup-dialog")).not.toBeInTheDocument();
    });

    it("marks setup as seen when dialog is closed", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: false,
        running: false,
        models: [],
      });

      const user = userEvent.setup();

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("ollama-setup-dialog")).toBeInTheDocument();
      });

      // Close the dialog
      await user.click(screen.getByRole("button", { name: "Close" }));

      // Check localStorage was updated
      expect(localStorage.getItem(OLLAMA_SETUP_SEEN_KEY)).toBe("true");
    });
  });

  describe("layout accessibility", () => {
    it("has a main landmark", () => {
      mockCheckOllamaStatus.mockRejectedValue(new Error("Not in Tauri"));

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.getByRole("main")).toBeInTheDocument();
    });

    it("renders content in correct order (header, sidebar, main)", () => {
      mockCheckOllamaStatus.mockRejectedValue(new Error("Not in Tauri"));

      const { container } = render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      const header = screen.getByTestId("header");
      const sidebar = screen.getByTestId("sidebar");
      const main = screen.getByRole("main");

      // Verify DOM order
      const allElements = container.querySelectorAll("[data-testid], main");
      const headerIndex = Array.from(allElements).indexOf(header);
      const sidebarIndex = Array.from(allElements).indexOf(sidebar);
      const mainIndex = Array.from(allElements).indexOf(main);

      expect(headerIndex).toBeLessThan(sidebarIndex);
      expect(sidebarIndex).toBeLessThan(mainIndex);
    });
  });
});

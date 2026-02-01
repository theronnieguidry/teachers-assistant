import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProviderSelector } from "@/components/wizard/ProviderSelector";

// Mock the tauri-bridge module
const mockCheckOllamaStatus = vi.fn();

vi.mock("@/services/tauri-bridge", () => ({
  checkOllamaStatus: () => mockCheckOllamaStatus(),
}));

describe("ProviderSelector", () => {
  const defaultProps = {
    value: "premium" as const,
    onChange: vi.fn(),
    ollamaModel: null,
    onOllamaModelChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckOllamaStatus.mockResolvedValue({
      installed: true,
      running: true,
      version: "0.1.0",
      models: ["llama3.2", "mistral"],
    });
  });

  describe("rendering", () => {
    it("renders both provider options", async () => {
      render(<ProviderSelector {...defaultProps} />);

      expect(screen.getByText("Premium AI")).toBeInTheDocument();
      expect(screen.getByText("Local AI")).toBeInTheDocument();
    });

    it("renders Premium AI with Best Quality badge", async () => {
      render(<ProviderSelector {...defaultProps} />);

      expect(screen.getByText("Best Quality")).toBeInTheDocument();
    });

    it("renders Local AI with Free badge", async () => {
      render(<ProviderSelector {...defaultProps} />);

      expect(screen.getByText("Free")).toBeInTheDocument();
    });

    it("shows provider descriptions", async () => {
      render(<ProviderSelector {...defaultProps} />);

      expect(screen.getByText(/Best quality - uses cloud-based AI/)).toBeInTheDocument();
      expect(screen.getByText(/Runs on this computer - no image analysis/)).toBeInTheDocument();
    });

    it("shows credits info for Premium AI", async () => {
      render(<ProviderSelector {...defaultProps} />);

      expect(screen.getByText(/Uses credits \(typically 3-6 per worksheet\)/)).toBeInTheDocument();
    });
  });

  describe("provider selection", () => {
    it("calls onChange when Premium AI is clicked", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<ProviderSelector {...defaultProps} value="local" onChange={onChange} />);

      await user.click(screen.getByText("Premium AI").closest("[role='button']")!);

      expect(onChange).toHaveBeenCalledWith("premium");
    });

    it("calls onChange when Local AI is clicked", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<ProviderSelector {...defaultProps} onChange={onChange} />);

      await user.click(screen.getByText("Local AI").closest("[role='button']")!);

      expect(onChange).toHaveBeenCalledWith("local");
    });
  });

  describe("Local AI status", () => {
    it("shows Ready status when Local AI is available with models", async () => {
      render(<ProviderSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Ready (2 models available)")).toBeInTheDocument();
      });
    });

    it("shows No models installed when Local AI is running but has no models", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: true,
        version: "0.1.0",
        models: [],
      });

      render(<ProviderSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("No models installed")).toBeInTheDocument();
      });
    });

    it("shows Not running when Local AI is not running", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: false,
        version: null,
        models: [],
      });

      render(<ProviderSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Not running")).toBeInTheDocument();
      });
    });

    it("shows Checking status initially", async () => {
      mockCheckOllamaStatus.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ProviderSelector {...defaultProps} />);

      expect(screen.getByText(/Checking local AI status/)).toBeInTheDocument();
    });
  });

  describe("Local AI model selection", () => {
    it("shows model dropdown when Local AI is selected and running", async () => {
      render(<ProviderSelector {...defaultProps} value="local" />);

      await waitFor(() => {
        expect(screen.getByText("Local AI Model")).toBeInTheDocument();
      });
    });

    it("does not show model dropdown when Premium AI is selected", async () => {
      render(<ProviderSelector {...defaultProps} value="premium" />);

      await waitFor(() => {
        expect(screen.queryByText("Local AI Model")).not.toBeInTheDocument();
      });
    });

    it("does not show model dropdown when Local AI is not running", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: false,
        version: null,
        models: [],
      });

      render(<ProviderSelector {...defaultProps} value="local" />);

      await waitFor(() => {
        expect(screen.queryByText("Local AI Model")).not.toBeInTheDocument();
      });
    });

    it("auto-selects first model when switching to Local AI", async () => {
      const onOllamaModelChange = vi.fn();
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ProviderSelector
          {...defaultProps}
          onChange={onChange}
          onOllamaModelChange={onOllamaModelChange}
        />
      );

      // Wait for Local AI status to load
      await waitFor(() => {
        expect(screen.getByText("Ready (2 models available)")).toBeInTheDocument();
      });

      // Click Local AI
      await user.click(screen.getByText("Local AI").closest("[role='button']")!);

      expect(onOllamaModelChange).toHaveBeenCalledWith("llama3.2");
    });

    it("clears model when switching away from Local AI", async () => {
      const onOllamaModelChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ProviderSelector
          {...defaultProps}
          value="local"
          ollamaModel="llama3.2"
          onOllamaModelChange={onOllamaModelChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Local AI Model")).toBeInTheDocument();
      });

      // Click Premium AI
      await user.click(screen.getByText("Premium AI").closest("[role='button']")!);

      expect(onOllamaModelChange).toHaveBeenCalledWith(null);
    });
  });

  describe("warning messages", () => {
    it("shows warning when Local AI is selected but not running", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: false,
        version: null,
        models: [],
      });

      render(<ProviderSelector {...defaultProps} value="local" />);

      await waitFor(() => {
        expect(
          screen.getByText(/Local AI is not running/i)
        ).toBeInTheDocument();
      });
    });

    it("shows warning when Local AI is selected but no models installed", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: true,
        version: "0.1.0",
        models: [],
      });

      render(<ProviderSelector {...defaultProps} value="local" />);

      await waitFor(() => {
        // Warning message in the amber box
        expect(
          screen.getByText(/Install a model from Settings/i)
        ).toBeInTheDocument();
      });
    });

    it("does not show warning when Premium AI is selected", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: false,
        version: null,
        models: [],
      });

      render(<ProviderSelector {...defaultProps} value="premium" />);

      await waitFor(() => {
        expect(
          screen.queryByText(/Local AI is not running/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("handles Local AI check failure gracefully", async () => {
      mockCheckOllamaStatus.mockRejectedValue(new Error("Connection failed"));

      render(<ProviderSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Not running")).toBeInTheDocument();
      });
    });
  });
});

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
    value: "claude" as const,
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
    it("renders all three provider options", async () => {
      render(<ProviderSelector {...defaultProps} />);

      expect(screen.getByText("Claude")).toBeInTheDocument();
      expect(screen.getByText("OpenAI")).toBeInTheDocument();
      expect(screen.getByText("Ollama")).toBeInTheDocument();
    });

    it("renders Claude with Recommended badge", async () => {
      render(<ProviderSelector {...defaultProps} />);

      expect(screen.getByText("Recommended")).toBeInTheDocument();
    });

    it("renders Ollama with Free badge", async () => {
      render(<ProviderSelector {...defaultProps} />);

      expect(screen.getByText("Free")).toBeInTheDocument();
    });

    it("shows provider descriptions", async () => {
      render(<ProviderSelector {...defaultProps} />);

      expect(screen.getByText(/Anthropic's AI - recommended for educational content/)).toBeInTheDocument();
      expect(screen.getByText(/GPT-4 powered content generation/)).toBeInTheDocument();
      expect(screen.getByText(/Run AI locally - no image analysis/)).toBeInTheDocument();
    });
  });

  describe("provider selection", () => {
    it("calls onChange when Claude is clicked", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<ProviderSelector {...defaultProps} value="openai" onChange={onChange} />);

      await user.click(screen.getByText("Claude").closest("[role='button']")!);

      expect(onChange).toHaveBeenCalledWith("claude");
    });

    it("calls onChange when OpenAI is clicked", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<ProviderSelector {...defaultProps} onChange={onChange} />);

      await user.click(screen.getByText("OpenAI").closest("[role='button']")!);

      expect(onChange).toHaveBeenCalledWith("openai");
    });

    it("calls onChange when Ollama is clicked", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<ProviderSelector {...defaultProps} onChange={onChange} />);

      await user.click(screen.getByText("Ollama").closest("[role='button']")!);

      expect(onChange).toHaveBeenCalledWith("ollama");
    });
  });

  describe("Ollama status", () => {
    it("shows Running status when Ollama is available with models", async () => {
      render(<ProviderSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Running (2 models)")).toBeInTheDocument();
      });
    });

    it("shows No models installed when Ollama is running but has no models", async () => {
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

    it("shows Not running when Ollama is not running", async () => {
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

      expect(screen.getByText("Checking...")).toBeInTheDocument();
    });
  });

  describe("Ollama model selection", () => {
    it("shows model dropdown when Ollama is selected and running", async () => {
      render(<ProviderSelector {...defaultProps} value="ollama" />);

      await waitFor(() => {
        expect(screen.getByText("Ollama Model")).toBeInTheDocument();
      });
    });

    it("does not show model dropdown when Ollama is not selected", async () => {
      render(<ProviderSelector {...defaultProps} value="claude" />);

      await waitFor(() => {
        expect(screen.queryByText("Ollama Model")).not.toBeInTheDocument();
      });
    });

    it("does not show model dropdown when Ollama is not running", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: false,
        version: null,
        models: [],
      });

      render(<ProviderSelector {...defaultProps} value="ollama" />);

      await waitFor(() => {
        expect(screen.queryByText("Ollama Model")).not.toBeInTheDocument();
      });
    });

    it("auto-selects first model when switching to Ollama", async () => {
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

      // Wait for Ollama status to load
      await waitFor(() => {
        expect(screen.getByText("Running (2 models)")).toBeInTheDocument();
      });

      // Click Ollama
      await user.click(screen.getByText("Ollama").closest("[role='button']")!);

      expect(onOllamaModelChange).toHaveBeenCalledWith("llama3.2");
    });

    it("clears model when switching away from Ollama", async () => {
      const onOllamaModelChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ProviderSelector
          {...defaultProps}
          value="ollama"
          ollamaModel="llama3.2"
          onOllamaModelChange={onOllamaModelChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Ollama Model")).toBeInTheDocument();
      });

      // Click Claude
      await user.click(screen.getByText("Claude").closest("[role='button']")!);

      expect(onOllamaModelChange).toHaveBeenCalledWith(null);
    });
  });

  describe("warning messages", () => {
    it("shows warning when Ollama is selected but not running", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: false,
        version: null,
        models: [],
      });

      render(<ProviderSelector {...defaultProps} value="ollama" />);

      await waitFor(() => {
        expect(
          screen.getByText(/Ollama is not running/i)
        ).toBeInTheDocument();
      });
    });

    it("shows warning when Ollama is selected but no models installed", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: true,
        version: "0.1.0",
        models: [],
      });

      render(<ProviderSelector {...defaultProps} value="ollama" />);

      await waitFor(() => {
        // Warning message in the amber box
        expect(
          screen.getByText(/Install a model in Ollama settings/i)
        ).toBeInTheDocument();
      });
    });

    it("does not show warning when Ollama is not selected", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: false,
        version: null,
        models: [],
      });

      render(<ProviderSelector {...defaultProps} value="claude" />);

      await waitFor(() => {
        expect(
          screen.queryByText(/Ollama is not running/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("handles Ollama check failure gracefully", async () => {
      mockCheckOllamaStatus.mockRejectedValue(new Error("Connection failed"));

      render(<ProviderSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Not running")).toBeInTheDocument();
      });
    });
  });
});

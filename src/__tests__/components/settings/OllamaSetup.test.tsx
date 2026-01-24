import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../utils";
import { OllamaSetup } from "@/components/settings/OllamaSetup";

// Mock the tauri-bridge module
const mockCheckOllamaStatus = vi.fn();
const mockInstallOllama = vi.fn();
const mockStartOllama = vi.fn();
const mockStopOllama = vi.fn();
const mockPullOllamaModel = vi.fn();
const mockListOllamaModels = vi.fn();
const mockGetRecommendedModels = vi.fn();
const mockIsTauriContext = vi.fn();

vi.mock("@/services/tauri-bridge", () => ({
  checkOllamaStatus: () => mockCheckOllamaStatus(),
  installOllama: () => mockInstallOllama(),
  startOllama: () => mockStartOllama(),
  stopOllama: () => mockStopOllama(),
  pullOllamaModel: (name: string) => mockPullOllamaModel(name),
  listOllamaModels: () => mockListOllamaModels(),
  getRecommendedModels: () => mockGetRecommendedModels(),
  isTauriContext: () => mockIsTauriContext(),
}));

describe("OllamaSetup", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: simulate Tauri context
    mockIsTauriContext.mockReturnValue(true);
    // Default mock responses
    mockCheckOllamaStatus.mockResolvedValue({
      installed: false,
      running: false,
      version: null,
      models: [],
    });
    mockListOllamaModels.mockResolvedValue([]);
    mockGetRecommendedModels.mockResolvedValue([
      ["llama3.2", "3B", "Fast, good for general tasks"],
      ["mistral", "7B", "Good balance of speed and quality"],
    ]);
  });

  describe("rendering", () => {
    it("should render the dialog when open", async () => {
      render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Local AI Setup")).toBeInTheDocument();
      });
    });

    it("should not render when closed", () => {
      render(<OllamaSetup {...defaultProps} open={false} />);

      expect(screen.queryByText("Local AI Setup")).not.toBeInTheDocument();
    });

    it("should show checking status initially", async () => {
      // Make the check take some time
      mockCheckOllamaStatus.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<OllamaSetup {...defaultProps} />);

      expect(screen.getByText("Checking Ollama status...")).toBeInTheDocument();
    });
  });

  describe("not installed state", () => {
    beforeEach(() => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: false,
        running: false,
        version: null,
        models: [],
      });
    });

    it("should show install section when Ollama is not installed", async () => {
      render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        // Card title exists
        expect(screen.getAllByText("Install Ollama").length).toBeGreaterThan(0);
      });
    });

    it("should show benefits of using Ollama", async () => {
      render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Completely free to use")).toBeInTheDocument();
        expect(screen.getByText("Your data stays on your computer")).toBeInTheDocument();
        expect(screen.getByText("Works offline after initial setup")).toBeInTheDocument();
      });
    });

    it("should call installOllama when Install button is clicked", async () => {
      mockInstallOllama.mockResolvedValue("Installed");
      const { user } = render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("Install Ollama").length).toBeGreaterThan(0);
      });

      // Get the button specifically (not the CardTitle)
      const installButtons = screen.getAllByRole("button", { name: "Install Ollama" });
      await user.click(installButtons[0]);

      await waitFor(() => {
        expect(mockInstallOllama).toHaveBeenCalled();
      });
    });
  });

  describe("not running state", () => {
    beforeEach(() => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: false,
        version: "0.1.0",
        models: [],
      });
    });

    it("should show start button when Ollama is installed but not running", async () => {
      render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Start Ollama Server")).toBeInTheDocument();
      });
    });

    it("should display the version when available", async () => {
      render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Version: 0.1.0")).toBeInTheDocument();
      });
    });

    it("should call startOllama when Start button is clicked", async () => {
      mockStartOllama.mockResolvedValue("Started");
      const { user } = render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Start Ollama Server")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Start Ollama Server" }));

      await waitFor(() => {
        expect(mockStartOllama).toHaveBeenCalled();
      });
    });
  });

  describe("no models state", () => {
    beforeEach(() => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: true,
        version: "0.1.0",
        models: [],
      });
    });

    it("should show model selection when running but no models", async () => {
      render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Download a Model")).toBeInTheDocument();
      });
    });

    it("should display recommended models", async () => {
      render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        // llama3.2 is now in the primary button text
        expect(screen.getByRole("button", { name: /llama3\.2/i })).toBeInTheDocument();
        // mistral is in the other options
        expect(screen.getByText("mistral")).toBeInTheDocument();
      });
    });

    it("should call pullOllamaModel when Download Recommended Model button is clicked", async () => {
      mockPullOllamaModel.mockResolvedValue("Pulled");
      const { user } = render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /llama3\.2/i })).toBeInTheDocument();
      });

      // Click the recommended model button
      await user.click(screen.getByRole("button", { name: /llama3\.2/i }));

      await waitFor(() => {
        expect(mockPullOllamaModel).toHaveBeenCalledWith("llama3.2");
      });
    });
  });

  describe("ready state", () => {
    beforeEach(() => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: true,
        running: true,
        version: "0.1.0",
        models: ["llama3.2"],
      });
      mockListOllamaModels.mockResolvedValue([
        { name: "llama3.2", size: "2.0 GB", modified_at: "2024-01-01" },
      ]);
    });

    it("should show ready state when Ollama is running with models", async () => {
      render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Ollama is Ready")).toBeInTheDocument();
      });
    });

    it("should display installed models", async () => {
      render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("llama3.2")).toBeInTheDocument();
        expect(screen.getByText("2.0 GB")).toBeInTheDocument();
      });
    });

    it("should show Add Model button", async () => {
      render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Add Model" })).toBeInTheDocument();
      });
    });

    it("should show Stop Server button", async () => {
      render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Stop Server" })).toBeInTheDocument();
      });
    });

    it("should call stopOllama when Stop Server button is clicked", async () => {
      mockStopOllama.mockResolvedValue("Stopped");
      const { user } = render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Stop Server" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Stop Server" }));

      await waitFor(() => {
        expect(mockStopOllama).toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("should display error message when check fails", async () => {
      mockCheckOllamaStatus.mockRejectedValue(new Error("Connection failed"));

      render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Connection failed")).toBeInTheDocument();
      });
    });

    it("should display error message when install fails", async () => {
      mockCheckOllamaStatus.mockResolvedValue({
        installed: false,
        running: false,
        version: null,
        models: [],
      });
      mockInstallOllama.mockRejectedValue(new Error("Installation failed"));

      const { user } = render(<OllamaSetup {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("Install Ollama").length).toBeGreaterThan(0);
      });

      const installButtons = screen.getAllByRole("button", { name: "Install Ollama" });
      await user.click(installButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Installation failed")).toBeInTheDocument();
      });
    });
  });

  describe("close button", () => {
    it("should call onOpenChange when Close button is clicked", async () => {
      const onOpenChange = vi.fn();
      const { user } = render(<OllamaSetup {...defaultProps} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Local AI Setup")).toBeInTheDocument();
      });

      // Get the visible Close button (not the sr-only one in the dialog close)
      const closeButtons = screen.getAllByRole("button", { name: "Close" });
      // The first one is the X button with sr-only text, the second is our explicit Close button
      await user.click(closeButtons[closeButtons.length - 1]);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

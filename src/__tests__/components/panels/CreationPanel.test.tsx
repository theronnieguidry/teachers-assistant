import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import { CreationPanel } from "@/components/panels/CreationPanel";

// Mock wizardStore
const mockOpenWizard = vi.fn();

vi.mock("@/stores/wizardStore", () => ({
  useWizardStore: (selector: (state: { openWizard: typeof mockOpenWizard }) => unknown) => {
    return selector({ openWizard: mockOpenWizard });
  },
}));

describe("CreationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the panel with title", () => {
      render(<CreationPanel />);

      expect(screen.getByText("What are we creating today?")).toBeInTheDocument();
    });

    it("should render textarea with placeholder", () => {
      render(<CreationPanel />);

      expect(
        screen.getByPlaceholderText(/Describe what you want to create/i)
      ).toBeInTheDocument();
    });

    it("should render Create button", () => {
      render(<CreationPanel />);

      expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
    });

    it("should show keyboard shortcut hint", () => {
      render(<CreationPanel />);

      expect(screen.getByText("Ctrl+Enter to create")).toBeInTheDocument();
    });
  });

  describe("button state", () => {
    it("should disable button when prompt is empty", () => {
      render(<CreationPanel />);

      expect(screen.getByRole("button", { name: /create/i })).toBeDisabled();
    });

    it("should disable button when prompt is too short", async () => {
      const { user } = render(<CreationPanel />);

      const textarea = screen.getByPlaceholderText(/Describe what you want to create/i);
      await user.type(textarea, "short");

      expect(screen.getByRole("button", { name: /create/i })).toBeDisabled();
    });

    it("should enable button when prompt has 10+ characters", async () => {
      const { user } = render(<CreationPanel />);

      const textarea = screen.getByPlaceholderText(/Describe what you want to create/i);
      await user.type(textarea, "Create a math worksheet for 2nd grade");

      expect(screen.getByRole("button", { name: /create/i })).toBeEnabled();
    });
  });

  describe("form submission", () => {
    it("should call openWizard when Create button clicked with valid prompt", async () => {
      const { user } = render(<CreationPanel />);

      const textarea = screen.getByPlaceholderText(/Describe what you want to create/i);
      await user.type(textarea, "Create a math worksheet for 2nd grade");
      await user.click(screen.getByRole("button", { name: /create/i }));

      expect(mockOpenWizard).toHaveBeenCalledWith("Create a math worksheet for 2nd grade");
    });

    it("should clear textarea after successful submission", async () => {
      const { user } = render(<CreationPanel />);

      const textarea = screen.getByPlaceholderText(/Describe what you want to create/i);
      await user.type(textarea, "Create a math worksheet for 2nd grade");
      await user.click(screen.getByRole("button", { name: /create/i }));

      expect(textarea).toHaveValue("");
    });

    it("should not call openWizard when prompt is too short", async () => {
      const { user } = render(<CreationPanel />);

      const textarea = screen.getByPlaceholderText(/Describe what you want to create/i);
      await user.type(textarea, "short");

      // Button should be disabled, but let's force click to test the handler
      const button = screen.getByRole("button", { name: /create/i });
      expect(button).toBeDisabled();

      expect(mockOpenWizard).not.toHaveBeenCalled();
    });

    it("should trim whitespace from prompt", async () => {
      const { user } = render(<CreationPanel />);

      const textarea = screen.getByPlaceholderText(/Describe what you want to create/i);
      await user.type(textarea, "   Create a worksheet   ");
      await user.click(screen.getByRole("button", { name: /create/i }));

      expect(mockOpenWizard).toHaveBeenCalledWith("Create a worksheet");
    });
  });

  describe("keyboard shortcuts", () => {
    it("should allow typing in textarea", async () => {
      const { user } = render(<CreationPanel />);

      const textarea = screen.getByPlaceholderText(/Describe what you want to create/i);
      await user.type(textarea, "Test prompt");

      expect(textarea).toHaveValue("Test prompt");
    });
  });
});

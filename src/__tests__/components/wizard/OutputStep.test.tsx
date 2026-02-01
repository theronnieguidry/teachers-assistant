import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OutputStep } from "@/components/wizard/OutputStep";
import { useWizardStore } from "@/stores/wizardStore";

vi.mock("@/stores/unifiedProjectStore", () => ({
  useUnifiedProjectStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      projects: [],
      loadProjects: vi.fn(),
    };
    if (typeof selector === "function") return selector(state);
    return state;
  }),
}));

describe("OutputStep", () => {
  const mockNextStep = vi.fn();
  const mockPrevStep = vi.fn();
  const mockSetOutputPath = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useWizardStore.setState({
      outputPath: null,
      title: "Test Project",
      targetProjectId: null,
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      setOutputPath: mockSetOutputPath,
      setTargetProjectId: vi.fn(),
    });
  });

  describe("output folder", () => {
    it("renders instructions text", () => {
      render(<OutputStep />);

      expect(
        screen.getByText(/choose a project and where to save your generated materials/i)
      ).toBeInTheDocument();
    });

    it("renders Output Folder label", () => {
      render(<OutputStep />);

      expect(screen.getByText("Output Folder")).toBeInTheDocument();
    });

    it("renders folder path input", () => {
      render(<OutputStep />);

      expect(
        screen.getByPlaceholderText(/select or enter a folder path/i)
      ).toBeInTheDocument();
    });

    it("renders Browse button", () => {
      render(<OutputStep />);

      expect(screen.getByRole("button", { name: /browse/i })).toBeInTheDocument();
    });

    it("pre-fills path from store", () => {
      useWizardStore.setState({ outputPath: "C:\\Existing\\Path" });

      render(<OutputStep />);

      expect(screen.getByDisplayValue("C:\\Existing\\Path")).toBeInTheDocument();
    });

    it("shows file save preview when path is entered", async () => {
      const user = userEvent.setup();
      render(<OutputStep />);

      const input = screen.getByPlaceholderText(/select or enter a folder path/i);
      await user.type(input, "C:\\Documents\\Output");

      expect(screen.getByText("Files will be saved to:")).toBeInTheDocument();
      expect(screen.getByText("C:\\Documents\\Output")).toBeInTheDocument();
    });

    it("displays list of generated files", () => {
      render(<OutputStep />);

      expect(screen.getByText("Files saved to folder:")).toBeInTheDocument();
      expect(screen.getByText(/Test Project - Worksheet\.html/)).toBeInTheDocument();
      expect(screen.getByText(/Test Project - Lesson Plan\.html/)).toBeInTheDocument();
      expect(screen.getByText(/Test Project - Answer Key\.html/)).toBeInTheDocument();
      expect(screen.getByText(/PDFs can be downloaded from the Preview/)).toBeInTheDocument();
    });
  });

  describe("navigation buttons", () => {
    it("renders Back and Next buttons", () => {
      render(<OutputStep />);

      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });

    it("calls prevStep when Back is clicked", async () => {
      const user = userEvent.setup();
      render(<OutputStep />);

      await user.click(screen.getByRole("button", { name: /back/i }));

      expect(mockPrevStep).toHaveBeenCalled();
    });

    it("calls nextStep when Next is clicked with valid path", async () => {
      const user = userEvent.setup();
      render(<OutputStep />);

      const input = screen.getByPlaceholderText(/select or enter a folder path/i);
      await user.type(input, "C:\\Output");

      await user.click(screen.getByRole("button", { name: /next/i }));

      expect(mockNextStep).toHaveBeenCalled();
    });
  });

  describe("Next button validation", () => {
    it("Next button is disabled when no path", () => {
      render(<OutputStep />);

      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    });

    it("Next button is enabled when path is entered", async () => {
      const user = userEvent.setup();
      render(<OutputStep />);

      const input = screen.getByPlaceholderText(/select or enter a folder path/i);
      await user.type(input, "C:\\Documents\\Output");

      expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
    });
  });

  describe("folder input", () => {
    it("updates path when typing in input", async () => {
      const user = userEvent.setup();
      render(<OutputStep />);

      const input = screen.getByPlaceholderText(/select or enter a folder path/i);
      await user.type(input, "C:\\Output");

      expect(mockSetOutputPath).toHaveBeenCalled();
    });

    it("opens folder dialog when Browse is clicked", async () => {
      const user = userEvent.setup();
      const mockPrompt = vi.fn().mockReturnValue("C:\\Selected\\Folder");
      global.prompt = mockPrompt;

      render(<OutputStep />);

      await user.click(screen.getByRole("button", { name: /browse/i }));

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockSetOutputPath).toHaveBeenCalledWith("C:\\Selected\\Folder");
    });

    it("does not update path when dialog is cancelled", async () => {
      const user = userEvent.setup();
      const mockPrompt = vi.fn().mockReturnValue(null);
      global.prompt = mockPrompt;

      render(<OutputStep />);

      await user.click(screen.getByRole("button", { name: /browse/i }));

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockSetOutputPath).not.toHaveBeenCalled();
    });
  });
});

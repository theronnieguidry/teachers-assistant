import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptReviewStep } from "@/components/wizard/PromptReviewStep";
import { useWizardStore } from "@/stores/wizardStore";
import { useAuthStore } from "@/stores/authStore";
import { useDesignPackStore } from "@/stores/designPackStore";

// Mock the polishPrompt API function
const mockPolishPrompt = vi.fn();
vi.mock("@/services/generation-api", () => ({
  polishPrompt: (...args: unknown[]) => mockPolishPrompt(...args),
}));

describe("PromptReviewStep", () => {
  const mockNextStep = vi.fn();
  const mockPrevStep = vi.fn();
  const mockSetPolishedPrompt = vi.fn();
  const mockSetUsePolishedPrompt = vi.fn();

  const defaultClassDetails = {
    grade: "3" as const,
    subject: "Math",
    format: "worksheet" as const,
    questionCount: 10,
    difficulty: "medium" as const,
    includeVisuals: true,
    includeAnswerKey: true,
    lessonLength: 30 as const,
    studentProfile: [] as ("needs_movement" | "struggles_reading" | "easily_frustrated" | "advanced" | "ell")[],
    teachingConfidence: "intermediate" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset wizard store
    useWizardStore.setState({
      prompt: "Create a math worksheet about fractions",
      classDetails: defaultClassDetails,
      selectedInspiration: [],
      polishedPrompt: null,
      usePolishedPrompt: true,
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      setPolishedPrompt: mockSetPolishedPrompt,
      setUsePolishedPrompt: mockSetUsePolishedPrompt,
    });

    // Reset auth store with valid session
    useAuthStore.setState({
      session: {
        access_token: "test-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "refresh-token",
        user: {
          id: "user-123",
          email: "test@example.com",
          aud: "authenticated",
          role: "authenticated",
          created_at: "2024-01-01T00:00:00Z",
          app_metadata: {},
          user_metadata: {},
        },
        expires_at: Date.now() + 3600000,
      },
    });

    useDesignPackStore.setState({
      packs: [],
      selectedPackId: null,
    });
  });

  it("shows loading state while polishing", async () => {
    // Make polishPrompt hang to see loading state
    mockPolishPrompt.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ polished: "polished", wasPolished: true }), 1000))
    );

    render(<PromptReviewStep />);

    expect(screen.getByText(/refining your request/i)).toBeInTheDocument();
  });

  it("shows K-6 soft-limit warning for grades 4-6", async () => {
    useWizardStore.setState({
      classDetails: {
        ...defaultClassDetails,
        grade: "6",
      },
    });

    mockPolishPrompt.mockResolvedValue({
      original: "Original",
      polished: "Polished",
      wasPolished: true,
    });

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(screen.getByText(/K-3 is still the strongest fit/i)).toBeInTheDocument();
    });
  });

  it("shows selected design-pack context in review", async () => {
    useDesignPackStore.setState({
      selectedPackId: "pack-1",
      packs: [
        {
          packId: "pack-1",
          name: "Spring Theme Pack",
          items: [
            {
              itemId: "item-1",
              type: "url",
              title: "Classroom Theme",
              sourceUrl: "https://example.com/theme",
            },
          ],
          createdAt: "2026-02-12T00:00:00Z",
          updatedAt: "2026-02-12T00:00:00Z",
        },
      ],
    });

    mockPolishPrompt.mockResolvedValue({
      original: "Original",
      polished: "Polished",
      wasPolished: true,
    });

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(screen.getByTestId("design-pack-context")).toBeInTheDocument();
      expect(screen.getByText(/Spring Theme Pack/)).toBeInTheDocument();
    });
  });

  describe("final prompt display", () => {
    it("displays polished prompt in 'What will be sent to AI' section by default", async () => {
      const polishedText = "Create a comprehensive 3rd grade math worksheet focusing on fraction concepts...";
      mockPolishPrompt.mockResolvedValue({
        original: "Create a math worksheet about fractions",
        polished: polishedText,
        wasPolished: true,
      });

      render(<PromptReviewStep />);

      await waitFor(() => {
        expect(screen.queryByText(/refining your request/i)).not.toBeInTheDocument();
      });

      // Should show "What will be sent to AI" label
      expect(screen.getByText(/what will be sent to ai/i)).toBeInTheDocument();

      // The final prompt display should contain the polished text
      const finalPromptDisplay = screen.getByTestId("final-prompt-display");
      expect(finalPromptDisplay).toHaveTextContent(polishedText);
    });

    it("displays original prompt when 'Use my original request' is selected", async () => {
      const originalText = "Create a math worksheet about fractions";
      const polishedText = "Enhanced math worksheet prompt...";
      mockPolishPrompt.mockResolvedValue({
        original: originalText,
        polished: polishedText,
        wasPolished: true,
      });

      const user = userEvent.setup();
      render(<PromptReviewStep />);

      await waitFor(() => {
        expect(screen.getByLabelText(/use my original request/i)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/use my original request/i));

      // The final prompt display should now show the original text
      const finalPromptDisplay = screen.getByTestId("final-prompt-display");
      expect(finalPromptDisplay).toHaveTextContent(originalText);
    });

    it("shows editable textarea when 'Edit the prompt' is selected", async () => {
      const polishedText = "Polished prompt text";
      mockPolishPrompt.mockResolvedValue({
        original: "Original",
        polished: polishedText,
        wasPolished: true,
      });

      const user = userEvent.setup();
      render(<PromptReviewStep />);

      await waitFor(() => {
        expect(screen.getByLabelText(/edit the prompt/i)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/edit the prompt/i));

      // Should show textarea with polished text
      await waitFor(() => {
        const textarea = screen.getByTestId("final-prompt-textarea");
        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveValue(polishedText);
      });
    });

    it("updates final prompt display when user edits the prompt", async () => {
      mockPolishPrompt.mockResolvedValue({
        original: "Original",
        polished: "Polished text",
        wasPolished: true,
      });

      const user = userEvent.setup();
      render(<PromptReviewStep />);

      await waitFor(() => {
        expect(screen.getByLabelText(/edit the prompt/i)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/edit the prompt/i));

      const textarea = await screen.findByTestId("final-prompt-textarea");
      await user.clear(textarea);
      await user.type(textarea, "My custom edited prompt");

      expect(textarea).toHaveValue("My custom edited prompt");
      expect(mockSetPolishedPrompt).toHaveBeenCalledWith("My custom edited prompt");
    });

    it("shows original prompt as reference when polished prompt differs", async () => {
      const originalText = "Create a math worksheet about fractions";
      const polishedText = "Enhanced math worksheet prompt...";
      mockPolishPrompt.mockResolvedValue({
        original: originalText,
        polished: polishedText,
        wasPolished: true,
      });

      render(<PromptReviewStep />);

      await waitFor(() => {
        expect(screen.queryByText(/refining your request/i)).not.toBeInTheDocument();
      });

      // Should show "Your original request" as a reference
      expect(screen.getByText(/your original request/i)).toBeInTheDocument();
      expect(screen.getByText(originalText)).toBeInTheDocument();
    });

    it("hides original reference when user selects original prompt", async () => {
      mockPolishPrompt.mockResolvedValue({
        original: "Create a math worksheet about fractions",
        polished: "Enhanced prompt...",
        wasPolished: true,
      });

      const user = userEvent.setup();
      render(<PromptReviewStep />);

      await waitFor(() => {
        expect(screen.getByLabelText(/use my original request/i)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/use my original request/i));

      // Original reference should be hidden when original is selected (no need to show it twice)
      await waitFor(() => {
        expect(screen.queryByText(/your original request/i)).not.toBeInTheDocument();
      });
    });
  });

  it("shows polished prompt when available", async () => {
    const polishedText = "Create a comprehensive 3rd grade math worksheet focusing on fraction concepts...";
    mockPolishPrompt.mockResolvedValue({
      original: "Create a math worksheet about fractions",
      polished: polishedText,
      wasPolished: true,
    });

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(screen.queryByText(/refining your request/i)).not.toBeInTheDocument();
    });

    // Check that polished text is displayed
    expect(screen.getByText(polishedText)).toBeInTheDocument();
  });

  it("shows error message when polishing fails", async () => {
    mockPolishPrompt.mockRejectedValue(new Error("API Error"));

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(screen.getByText(/could not enhance your prompt/i)).toBeInTheDocument();
    });
  });

  it("shows original prompt when polishing fails", async () => {
    mockPolishPrompt.mockRejectedValue(new Error("API Error"));

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(screen.queryByText(/refining your request/i)).not.toBeInTheDocument();
    });

    // Should still show the original prompt in the "What will be sent to AI" section
    const finalPromptDisplay = screen.getByTestId("final-prompt-display");
    expect(finalPromptDisplay).toHaveTextContent("Create a math worksheet about fractions");
  });

  it("shows radio options when polishing succeeds", async () => {
    mockPolishPrompt.mockResolvedValue({
      original: "Original",
      polished: "Polished",
      wasPolished: true,
    });

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(screen.getByLabelText(/use enhanced version/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/use my original request/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/edit the prompt/i)).toBeInTheDocument();
  });

  it("switching to original sets usePolishedPrompt to false", async () => {
    mockPolishPrompt.mockResolvedValue({
      original: "Original",
      polished: "Polished",
      wasPolished: true,
    });

    const user = userEvent.setup();
    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(screen.getByLabelText(/use my original request/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/use my original request/i));

    expect(mockSetUsePolishedPrompt).toHaveBeenCalledWith(false);
  });

  it("switching to edited enables textarea", async () => {
    mockPolishPrompt.mockResolvedValue({
      original: "Original",
      polished: "Polished prompt text",
      wasPolished: true,
    });

    const user = userEvent.setup();
    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(screen.getByLabelText(/edit the prompt/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/edit the prompt/i));

    // Should show textarea instead of readonly div
    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  it("Continue button advances to next step", async () => {
    mockPolishPrompt.mockResolvedValue({
      original: "Original",
      polished: "Polished",
      wasPolished: true,
    });

    const user = userEvent.setup();
    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(mockNextStep).toHaveBeenCalledTimes(1);
  });

  it("Back button returns to previous step", async () => {
    mockPolishPrompt.mockResolvedValue({
      original: "Original",
      polished: "Polished",
      wasPolished: true,
    });

    const user = userEvent.setup();
    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(mockPrevStep).toHaveBeenCalledTimes(1);
  });

  it("skips polishing call when already polished", async () => {
    useWizardStore.setState({
      polishedPrompt: "Already polished prompt",
    });

    render(<PromptReviewStep />);

    // Should not call polishPrompt when already polished
    expect(mockPolishPrompt).not.toHaveBeenCalled();
  });

  it("handles null session gracefully", async () => {
    useAuthStore.setState({ session: null });

    render(<PromptReviewStep />);

    // Should not call polishPrompt without session
    expect(mockPolishPrompt).not.toHaveBeenCalled();

    // Should not show loading state indefinitely
    await waitFor(() => {
      expect(screen.queryByText(/refining your request/i)).not.toBeInTheDocument();
    });
  });

  it("defaults to original when prompt was not actually polished", async () => {
    mockPolishPrompt.mockResolvedValue({
      original: "Already detailed prompt that is longer than 100 characters...",
      polished: "Already detailed prompt that is longer than 100 characters...",
      wasPolished: false, // Prompt was already detailed
    });

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(mockSetUsePolishedPrompt).toHaveBeenCalledWith(false);
    });
  });

  it("calls polishPrompt with correct parameters", async () => {
    useWizardStore.setState({
      selectedInspiration: [
        { id: "insp-1", title: "Math Article", type: "url" },
        { id: "insp-2", title: "PDF Resource", type: "pdf" },
      ],
    });

    mockPolishPrompt.mockResolvedValue({
      original: "Original",
      polished: "Polished",
      wasPolished: true,
    });

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(mockPolishPrompt).toHaveBeenCalled();
    });

    expect(mockPolishPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Create a math worksheet about fractions",
        grade: "3",
        subject: "Math",
        format: "worksheet",
        questionCount: 10,
        difficulty: "medium",
        includeVisuals: true,
        inspirationTitles: ["Math Article", "PDF Resource"],
      }),
      "test-token"
    );
  });

  it("shows header message about what will be sent to AI", async () => {
    mockPolishPrompt.mockResolvedValue({
      original: "Original",
      polished: "Polished",
      wasPolished: true,
    });

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(
        screen.getByText(/Here's what we'll send to AI/i)
      ).toBeInTheDocument();
    });
  });

  it("shows enhanced message when polishing occurred", async () => {
    mockPolishPrompt.mockResolvedValue({
      original: "Original",
      polished: "Polished",
      wasPolished: true,
    });

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(
        screen.getByText(/I've enhanced your request/i)
      ).toBeInTheDocument();
    });
  });

  it("does not show radio options when polishing was skipped", async () => {
    mockPolishPrompt.mockResolvedValue({
      original: "Same prompt",
      polished: "Same prompt",
      wasPolished: false,
    });

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(screen.queryByText(/refining your request/i)).not.toBeInTheDocument();
    });

    // Radio options should not be shown when prompt wasn't actually polished
    expect(screen.queryByLabelText(/use enhanced version/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/use my original request/i)).not.toBeInTheDocument();
  });

  describe("skip reason display", () => {
    it("shows skip reason when Ollama is unavailable", async () => {
      mockPolishPrompt.mockResolvedValue({
        original: "Original prompt",
        polished: "Original prompt",
        wasPolished: false,
        skipReason: "ollama_unavailable",
      });

      render(<PromptReviewStep />);

      await waitFor(() => {
        expect(screen.getByTestId("skip-reason-notice")).toBeInTheDocument();
      });

      expect(screen.getByText(/ollama is not running/i)).toBeInTheDocument();
    });

    it("shows skip reason when prompt is already detailed", async () => {
      mockPolishPrompt.mockResolvedValue({
        original: "A very detailed prompt that is longer than 100 characters",
        polished: "A very detailed prompt that is longer than 100 characters",
        wasPolished: false,
        skipReason: "already_detailed",
      });

      render(<PromptReviewStep />);

      await waitFor(() => {
        expect(screen.getByTestId("skip-reason-notice")).toBeInTheDocument();
      });

      expect(screen.getByText(/already detailed enough/i)).toBeInTheDocument();
    });

    it("shows skip reason when there is an Ollama error", async () => {
      mockPolishPrompt.mockResolvedValue({
        original: "Original",
        polished: "Original",
        wasPolished: false,
        skipReason: "ollama_error",
      });

      render(<PromptReviewStep />);

      await waitFor(() => {
        expect(screen.getByTestId("skip-reason-notice")).toBeInTheDocument();
      });

      expect(screen.getByText(/make sure ollama is running/i)).toBeInTheDocument();
    });

    it("does not show skip reason notice when polishing succeeded", async () => {
      mockPolishPrompt.mockResolvedValue({
        original: "Original",
        polished: "Polished and enhanced prompt",
        wasPolished: true,
      });

      render(<PromptReviewStep />);

      await waitFor(() => {
        expect(screen.queryByText(/refining your request/i)).not.toBeInTheDocument();
      });

      expect(screen.queryByTestId("skip-reason-notice")).not.toBeInTheDocument();
    });
  });
});

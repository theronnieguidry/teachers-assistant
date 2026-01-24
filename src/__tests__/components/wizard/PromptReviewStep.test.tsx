import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptReviewStep } from "@/components/wizard/PromptReviewStep";
import { useWizardStore } from "@/stores/wizardStore";
import { useAuthStore } from "@/stores/authStore";

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
  });

  it("shows loading state while polishing", async () => {
    // Make polishPrompt hang to see loading state
    mockPolishPrompt.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ polished: "polished", wasPolished: true }), 1000))
    );

    render(<PromptReviewStep />);

    expect(screen.getByText(/refining your request/i)).toBeInTheDocument();
  });

  it("displays original prompt always", async () => {
    mockPolishPrompt.mockResolvedValue({
      original: "Create a math worksheet about fractions",
      polished: "Enhanced math worksheet prompt...",
      wasPolished: true,
    });

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(screen.getByText(/your original request/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Create a math worksheet about fractions")).toBeInTheDocument();
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
    expect(screen.getByLabelText(/edit the enhanced version/i)).toBeInTheDocument();
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
      expect(screen.getByLabelText(/edit the enhanced version/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/edit the enhanced version/i));

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

  it("shows header message about cleaning up request", async () => {
    mockPolishPrompt.mockResolvedValue({
      original: "Original",
      polished: "Polished",
      wasPolished: true,
    });

    render(<PromptReviewStep />);

    await waitFor(() => {
      expect(
        screen.getByText(/I cleaned up your request a bit/i)
      ).toBeInTheDocument();
    });
  });
});

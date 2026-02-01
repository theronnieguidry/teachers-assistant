import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreviewTabs } from "@/components/preview/PreviewTabs";

// Mock the auth store
vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({
    session: { access_token: "test-token" },
  }),
}));

// Mock generation-api service
vi.mock("@/services/generation-api", () => ({
  generatePdf: vi.fn().mockResolvedValue(new Blob(["test"], { type: "application/pdf" })),
}));

describe("PreviewTabs", () => {
  const defaultProps = {
    worksheetHtml: "<h1>Worksheet Content</h1>",
    lessonPlanHtml: "<h1>Lesson Plan Content</h1>",
    answerKeyHtml: "<h1>Answer Key Content</h1>",
    projectTitle: "Test Project",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all three tabs", () => {
    render(<PreviewTabs {...defaultProps} />);

    expect(screen.getByRole("tab", { name: /worksheet/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /lesson plan/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /answer key/i })).toBeInTheDocument();
  });

  it("shows worksheet tab as active by default", () => {
    render(<PreviewTabs {...defaultProps} />);

    const worksheetTab = screen.getByRole("tab", { name: /worksheet/i });
    expect(worksheetTab).toHaveAttribute("data-state", "active");
  });

  it("switches tabs when clicked", async () => {
    const user = userEvent.setup();
    render(<PreviewTabs {...defaultProps} />);

    const lessonPlanTab = screen.getByRole("tab", { name: /lesson plan/i });
    await user.click(lessonPlanTab);

    await waitFor(() => {
      expect(lessonPlanTab).toHaveAttribute("data-state", "active");
    });
    expect(screen.getByRole("tab", { name: /worksheet/i })).toHaveAttribute(
      "data-state",
      "inactive"
    );
  });

  it("hides tabs without content", () => {
    render(
      <PreviewTabs
        {...defaultProps}
        lessonPlanHtml=""
      />
    );

    // Tabs without content are not rendered at all
    expect(screen.queryByRole("tab", { name: /lesson plan/i })).not.toBeInTheDocument();
    // Tabs with content are still rendered
    expect(screen.getByRole("tab", { name: /worksheet/i })).toBeInTheDocument();
  });

  it("renders print button", () => {
    render(<PreviewTabs {...defaultProps} />);

    expect(screen.getByRole("button", { name: /print/i })).toBeInTheDocument();
  });

  it("renders PDF download button", () => {
    render(<PreviewTabs {...defaultProps} />);

    expect(screen.getByRole("button", { name: /pdf/i })).toBeInTheDocument();
  });

  it("disables buttons when no content", () => {
    render(
      <PreviewTabs
        worksheetHtml=""
        lessonPlanHtml=""
        answerKeyHtml=""
        projectTitle="Empty Project"
      />
    );

    expect(screen.getByRole("button", { name: /print/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /pdf/i })).toBeDisabled();
  });

  it("defaults to first tab with content when worksheet is empty", () => {
    render(
      <PreviewTabs
        worksheetHtml=""
        lessonPlanHtml="<p>Content</p>"
        answerKeyHtml=""
        projectTitle="Test"
      />
    );

    // When worksheet is empty, lesson plan should be the active tab
    expect(screen.getByRole("tab", { name: /lesson plan/i })).toHaveAttribute("data-state", "active");
  });
});

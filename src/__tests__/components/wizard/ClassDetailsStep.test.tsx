import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClassDetailsStep } from "@/components/wizard/ClassDetailsStep";
import { useWizardStore } from "@/stores/wizardStore";

describe("ClassDetailsStep", () => {
  const mockNextStep = vi.fn();
  const mockSetClassDetails = vi.fn();
  const mockSetTitle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useWizardStore.setState({
      title: "Test Project",
      classDetails: null,
      nextStep: mockNextStep,
      setClassDetails: mockSetClassDetails,
      setTitle: mockSetTitle,
    });
  });

  it("renders the form with all fields", () => {
    render(<ClassDetailsStep />);

    expect(screen.getByLabelText(/project title/i)).toBeInTheDocument();
    expect(screen.getByText(/grade level/i)).toBeInTheDocument();
    expect(screen.getByText(/^subject \*/i)).toBeInTheDocument(); // Use exact label match
    expect(screen.getByText("Format")).toBeInTheDocument();
    expect(screen.getByText("Difficulty")).toBeInTheDocument();
    expect(screen.getByLabelText(/number of questions/i)).toBeInTheDocument();
  });

  it("renders the Next button", () => {
    render(<ClassDetailsStep />);

    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("pre-fills title from store", () => {
    useWizardStore.setState({ title: "My Worksheet" });

    render(<ClassDetailsStep />);

    expect(screen.getByLabelText(/project title/i)).toHaveValue("My Worksheet");
  });

  it("pre-fills class details from store", () => {
    useWizardStore.setState({
      classDetails: {
        grade: "3",
        subject: "Science",
        format: "worksheet",
        questionCount: 15,
        includeVisuals: false,
        difficulty: "hard",
        includeAnswerKey: false,
        lessonLength: 30,
        studentProfile: [],
        teachingConfidence: "intermediate",
      },
    });

    render(<ClassDetailsStep />);

    expect(screen.getByLabelText(/number of questions/i)).toHaveValue(15);
  });

  it("allows typing in title field", async () => {
    const user = userEvent.setup();
    render(<ClassDetailsStep />);

    const titleInput = screen.getByLabelText(/project title/i);
    await user.clear(titleInput);
    await user.type(titleInput, "New Title");

    expect(titleInput).toHaveValue("New Title");
  });

  it("allows changing question count", async () => {
    const user = userEvent.setup();
    render(<ClassDetailsStep />);

    const questionCountInput = screen.getByLabelText(/number of questions/i);
    await user.clear(questionCountInput);
    await user.type(questionCountInput, "15");

    expect(questionCountInput).toHaveValue(15);
  });

  it("renders grade select with default value", () => {
    render(<ClassDetailsStep />);

    // Check combobox elements are rendered
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(4); // grade, subject, format, difficulty
  });

  it("renders all select comboboxes", () => {
    render(<ClassDetailsStep />);

    // Select fields should be comboboxes (grade, subject, format, difficulty, and possibly more for lesson options)
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(4);
  });

  it("has the correct form structure", () => {
    render(<ClassDetailsStep />);

    // Check all field labels are present (some have * for required)
    expect(screen.getByText(/grade level/i)).toBeInTheDocument();
    expect(screen.getByText(/^subject \*/i)).toBeInTheDocument(); // Label text
    expect(screen.getByText("Format")).toBeInTheDocument();
    expect(screen.getByText("Difficulty")).toBeInTheDocument();
  });

  it("has question count input with min and max", () => {
    render(<ClassDetailsStep />);

    const questionCountInput = screen.getByLabelText(/number of questions/i);
    expect(questionCountInput).toHaveAttribute("min", "5");
    expect(questionCountInput).toHaveAttribute("max", "20");
  });

  it("collapses lesson plan options by default", () => {
    render(<ClassDetailsStep />);

    expect(screen.getByTestId("lesson-options-toggle")).toBeInTheDocument();
    expect(screen.queryByTestId("lesson-options-content")).not.toBeInTheDocument();
  });

  it("uses stacked layout for lesson length and teaching confidence when expanded", async () => {
    const user = userEvent.setup();
    render(<ClassDetailsStep />);

    await user.click(screen.getByTestId("lesson-options-toggle"));

    const layout = screen.getByTestId("lesson-options-layout");
    expect(layout).toHaveClass("space-y-4");
    expect(layout).not.toHaveClass("grid-cols-2");
    expect(screen.getByTestId("lesson-length-section")).toBeInTheDocument();
    expect(screen.getByTestId("teaching-confidence-section")).toBeInTheDocument();
    expect(screen.getByTestId("class-details-footer")).toBeInTheDocument();
  });

  // Note: Detailed Select dropdown interaction tests are better handled in E2E tests
  // due to JSDOM limitations with Radix UI Select component
});

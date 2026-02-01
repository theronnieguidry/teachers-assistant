import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import userEvent from "@testing-library/user-event";
import { ArtifactCard, ArtifactListItem } from "@/components/library/ArtifactCard";
import type { ArtifactType, Grade } from "@/types";

const mockArtifact = {
  artifactId: "art-1",
  projectId: "proj-1",
  jobId: "job-1",
  type: "student_page" as ArtifactType,
  title: "Addition Practice - Student Page",
  grade: "2" as Grade,
  subject: "Math",
  objectiveTags: ["K.MATH.COUNT.1_20", "2.MATH.ADD.SUB.100"],
  designPackId: undefined,
  filePath: undefined,
  createdAt: "2026-01-15T10:00:00Z",
};

const mockHandlers = {
  onView: vi.fn(),
  onPrint: vi.fn(),
  onDelete: vi.fn(),
  onEditTags: vi.fn(),
};

describe("ArtifactCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render artifact title", () => {
    render(<ArtifactCard artifact={mockArtifact} {...mockHandlers} />);
    expect(screen.getByText("Addition Practice - Student Page")).toBeInTheDocument();
  });

  it("should render artifact grade", () => {
    render(<ArtifactCard artifact={mockArtifact} {...mockHandlers} />);
    expect(screen.getByText("Grade 2")).toBeInTheDocument();
  });

  it("should render artifact subject", () => {
    render(<ArtifactCard artifact={mockArtifact} {...mockHandlers} />);
    expect(screen.getByText("Math")).toBeInTheDocument();
  });

  it("should render artifact type label", () => {
    render(<ArtifactCard artifact={mockArtifact} {...mockHandlers} />);
    expect(screen.getByText("Student Page")).toBeInTheDocument();
  });

  it("should render formatted date", () => {
    render(<ArtifactCard artifact={mockArtifact} {...mockHandlers} />);
    expect(screen.getByText("Jan 15, 2026")).toBeInTheDocument();
  });

  it("should show first 2 objective tags", () => {
    render(<ArtifactCard artifact={mockArtifact} {...mockHandlers} />);
    expect(screen.getByText("K.MATH.COUNT.1_20")).toBeInTheDocument();
    expect(screen.getByText("2.MATH.ADD.SUB.100")).toBeInTheDocument();
  });

  it("should show +N more badge when more than 2 tags", () => {
    const artifactWithManyTags = {
      ...mockArtifact,
      objectiveTags: ["tag1", "tag2", "tag3", "tag4"],
    };
    render(<ArtifactCard artifact={artifactWithManyTags} {...mockHandlers} />);
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("should not show tags section when no tags", () => {
    const noTags = { ...mockArtifact, objectiveTags: [] };
    render(<ArtifactCard artifact={noTags} {...mockHandlers} />);
    expect(screen.queryByText("+")).not.toBeInTheDocument();
  });

  it("should call onView when View button is clicked", async () => {
    const user = userEvent.setup();
    render(<ArtifactCard artifact={mockArtifact} {...mockHandlers} />);

    await user.click(screen.getByRole("button", { name: /view/i }));

    expect(mockHandlers.onView).toHaveBeenCalledWith("art-1");
  });

  it("should render different icons for different artifact types", () => {
    const teacherScript = { ...mockArtifact, type: "teacher_script" as ArtifactType };
    const { rerender } = render(
      <ArtifactCard artifact={teacherScript} {...mockHandlers} />
    );
    expect(screen.getByText("Teacher Script")).toBeInTheDocument();

    const answerKey = { ...mockArtifact, type: "answer_key" as ArtifactType };
    rerender(<ArtifactCard artifact={answerKey} {...mockHandlers} />);
    expect(screen.getByText("Answer Key")).toBeInTheDocument();
  });
});

describe("ArtifactListItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render artifact title", () => {
    render(<ArtifactListItem artifact={mockArtifact} {...mockHandlers} />);
    expect(screen.getByText("Addition Practice - Student Page")).toBeInTheDocument();
  });

  it("should render artifact subject", () => {
    render(<ArtifactListItem artifact={mockArtifact} {...mockHandlers} />);
    expect(screen.getByText("Math")).toBeInTheDocument();
  });

  it("should render grade badge", () => {
    render(<ArtifactListItem artifact={mockArtifact} {...mockHandlers} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should render type badge", () => {
    render(<ArtifactListItem artifact={mockArtifact} {...mockHandlers} />);
    expect(screen.getByText("Student Page")).toBeInTheDocument();
  });
});

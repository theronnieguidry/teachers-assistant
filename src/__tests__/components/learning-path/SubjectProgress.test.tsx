import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubjectProgressCard } from "@/components/learning-path/SubjectProgress";
import type { SubjectProgress } from "@/types";

describe("SubjectProgressCard", () => {
  const mockProgress: SubjectProgress = {
    subject: "Math",
    totalObjectives: 20,
    mastered: 8,
    inProgress: 3,
    needsReview: 2,
    notStarted: 7,
    percentComplete: 40,
  };

  describe("default (non-compact) mode", () => {
    it("renders subject name", () => {
      render(<SubjectProgressCard progress={mockProgress} />);
      expect(screen.getByText("Math")).toBeInTheDocument();
    });

    it("displays mastery count", () => {
      render(<SubjectProgressCard progress={mockProgress} />);
      expect(screen.getByText("8 of 20 skills mastered")).toBeInTheDocument();
    });

    it("renders progress bar", () => {
      render(<SubjectProgressCard progress={mockProgress} />);
      // Progress bar should be present
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
    });

    it("displays in-progress count when > 0", () => {
      render(<SubjectProgressCard progress={mockProgress} />);
      expect(screen.getByText("3 in progress")).toBeInTheDocument();
    });

    it("displays needs-review count when > 0", () => {
      render(<SubjectProgressCard progress={mockProgress} />);
      expect(screen.getByText("2 need review")).toBeInTheDocument();
    });

    it("hides in-progress when 0", () => {
      render(
        <SubjectProgressCard
          progress={{ ...mockProgress, inProgress: 0 }}
        />
      );
      expect(screen.queryByText(/in progress/)).not.toBeInTheDocument();
    });

    it("hides needs-review when 0", () => {
      render(
        <SubjectProgressCard
          progress={{ ...mockProgress, needsReview: 0 }}
        />
      );
      expect(screen.queryByText(/need review/)).not.toBeInTheDocument();
    });
  });

  describe("compact mode", () => {
    it("renders subject name", () => {
      render(<SubjectProgressCard progress={mockProgress} compact />);
      expect(screen.getByText("Math")).toBeInTheDocument();
    });

    it("displays count in compact format", () => {
      render(<SubjectProgressCard progress={mockProgress} compact />);
      expect(screen.getByText("8/20")).toBeInTheDocument();
    });

    it("renders progress bar", () => {
      render(<SubjectProgressCard progress={mockProgress} compact />);
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe("subject icons", () => {
    const subjects = ["Math", "Reading", "Writing", "Science", "Social Studies"];

    subjects.forEach((subject) => {
      it(`renders icon for ${subject}`, () => {
        render(
          <SubjectProgressCard
            progress={{ ...mockProgress, subject }}
          />
        );
        // Icon should be rendered (lucide icons render as svg)
        const icon = document.querySelector("svg");
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe("click handling", () => {
    it("calls onClick when clicked", () => {
      const handleClick = vi.fn();
      render(
        <SubjectProgressCard progress={mockProgress} onClick={handleClick} />
      );

      fireEvent.click(screen.getByText("Math"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("has cursor-pointer when onClick is provided", () => {
      const { container } = render(
        <SubjectProgressCard progress={mockProgress} onClick={() => {}} />
      );
      expect(container.firstChild).toHaveClass("cursor-pointer");
    });

    it("does not have cursor-pointer when onClick is not provided", () => {
      const { container } = render(
        <SubjectProgressCard progress={mockProgress} />
      );
      expect(container.firstChild).not.toHaveClass("cursor-pointer");
    });
  });
});

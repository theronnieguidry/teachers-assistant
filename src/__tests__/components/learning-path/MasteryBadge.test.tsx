import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MasteryBadge, MasteryIcon } from "@/components/learning-path/MasteryBadge";

describe("MasteryBadge", () => {
  describe("with showLabel=false (default)", () => {
    it("renders not_started state", () => {
      render(<MasteryBadge state="not_started" />);
      expect(screen.getByTitle("Not Started")).toBeInTheDocument();
    });

    it("renders in_progress state", () => {
      render(<MasteryBadge state="in_progress" />);
      expect(screen.getByTitle("In Progress")).toBeInTheDocument();
    });

    it("renders mastered state", () => {
      render(<MasteryBadge state="mastered" />);
      expect(screen.getByTitle("Mastered")).toBeInTheDocument();
    });

    it("renders needs_review state", () => {
      render(<MasteryBadge state="needs_review" />);
      expect(screen.getByTitle("Needs Review")).toBeInTheDocument();
    });
  });

  describe("with showLabel=true", () => {
    it("displays label text for not_started", () => {
      render(<MasteryBadge state="not_started" showLabel />);
      expect(screen.getByText("Not Started")).toBeInTheDocument();
    });

    it("displays label text for in_progress", () => {
      render(<MasteryBadge state="in_progress" showLabel />);
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("displays label text for mastered", () => {
      render(<MasteryBadge state="mastered" showLabel />);
      expect(screen.getByText("Mastered")).toBeInTheDocument();
    });

    it("displays label text for needs_review", () => {
      render(<MasteryBadge state="needs_review" showLabel />);
      expect(screen.getByText("Needs Review")).toBeInTheDocument();
    });
  });

  describe("sizes", () => {
    it("renders small size", () => {
      const { container } = render(<MasteryBadge state="mastered" size="sm" />);
      expect(container.firstChild).toHaveClass("h-5", "w-5");
    });

    it("renders medium size (default)", () => {
      const { container } = render(<MasteryBadge state="mastered" />);
      expect(container.firstChild).toHaveClass("h-6", "w-6");
    });

    it("renders large size", () => {
      const { container } = render(<MasteryBadge state="mastered" size="lg" />);
      expect(container.firstChild).toHaveClass("h-8", "w-8");
    });
  });

  describe("custom className", () => {
    it("accepts custom className", () => {
      const { container } = render(
        <MasteryBadge state="mastered" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});

describe("MasteryIcon", () => {
  it("renders icon for each state", () => {
    const states = ["not_started", "in_progress", "mastered", "needs_review"] as const;

    states.forEach((state) => {
      const { container } = render(<MasteryIcon state={state} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  it("accepts custom className", () => {
    const { container } = render(
      <MasteryIcon state="mastered" className="h-10 w-10" />
    );
    expect(container.querySelector("svg")).toHaveClass("h-10", "w-10");
  });
});

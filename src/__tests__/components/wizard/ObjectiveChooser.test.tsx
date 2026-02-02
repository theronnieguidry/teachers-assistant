import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObjectiveChooser } from "@/components/wizard/ObjectiveChooser";
import * as generationApi from "@/services/generation-api";
import type { ObjectiveRecommendation } from "@/types";

// Mock the generation API
vi.mock("@/services/generation-api", () => ({
  getRecommendedObjectives: vi.fn(),
  searchObjectives: vi.fn(),
}));

// Mock the auth store
vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({
    session: { access_token: "test-token" },
  }),
}));

describe("ObjectiveChooser", () => {
  const mockObjectives: ObjectiveRecommendation[] = [
    {
      id: "math_1_01",
      text: "Add numbers with sums up to 10",
      difficulty: "easy",
      estimatedMinutes: 30,
      unitTitle: "Addition Within 10",
      whyRecommended: "Foundation skill",
      vocabulary: ["add", "plus", "sum"],
      activities: ["Use counters"],
    },
    {
      id: "math_1_02",
      text: "Subtract numbers within 5",
      difficulty: "easy",
      estimatedMinutes: 30,
      unitTitle: "Subtraction Within 10",
      whyRecommended: "Foundation skill",
    },
    {
      id: "math_1_03",
      text: "Solve word problems",
      difficulty: "standard",
      estimatedMinutes: 45,
      unitTitle: "Word Problems",
      whyRecommended: "Builds on addition",
    },
  ];

  const defaultProps = {
    grade: "1" as const,
    subject: "Math",
    onSelect: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generationApi.getRecommendedObjectives).mockResolvedValue(mockObjectives);
    vi.mocked(generationApi.searchObjectives).mockResolvedValue([]);
  });

  it("should render loading state initially", () => {
    render(<ObjectiveChooser {...defaultProps} />);

    // Should show loading skeletons or spinner
    expect(screen.getByText(/Choose a learning objective/i)).toBeInTheDocument();
  });

  it("should fetch and display objectives", async () => {
    render(<ObjectiveChooser {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Add numbers with sums up to 10")).toBeInTheDocument();
    });

    expect(screen.getByText("Subtract numbers within 5")).toBeInTheDocument();
    expect(screen.getByText("Solve word problems")).toBeInTheDocument();
  });

  it("should display objective details", async () => {
    render(<ObjectiveChooser {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Addition Within 10")).toBeInTheDocument();
    });

    // Multiple objectives may have the same duration/difficulty, so check for at least one
    expect(screen.getAllByText("~30 min").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Foundation skill").length).toBeGreaterThan(0);
  });

  it("should display difficulty badges", async () => {
    render(<ObjectiveChooser {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText("Foundation").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("Standard")).toBeInTheDocument();
  });

  it("should call onSelect when objective is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ObjectiveChooser {...defaultProps} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Add numbers with sums up to 10")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Add numbers with sums up to 10"));

    expect(onSelect).toHaveBeenCalledWith(mockObjectives[0]);
  });

  it("should call onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<ObjectiveChooser {...defaultProps} onCancel={onCancel} />);

    await waitFor(() => {
      expect(screen.getByText(/I'll write my own topic/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/I'll write my own topic/i));

    expect(onCancel).toHaveBeenCalled();
  });

  it("should show search input", async () => {
    render(<ObjectiveChooser {...defaultProps} />);

    expect(screen.getByPlaceholderText(/Search objectives/i)).toBeInTheDocument();
  });

  it("should search when search button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(generationApi.searchObjectives).mockResolvedValue([mockObjectives[0]]);

    render(<ObjectiveChooser {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search objectives/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search objectives/i);
    await user.type(searchInput, "addition");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(generationApi.searchObjectives).toHaveBeenCalledWith(
        "Math",
        "addition",
        "test-token",
        "1"
      );
    });
  });

  it("should show empty state when no objectives found", async () => {
    vi.mocked(generationApi.getRecommendedObjectives).mockResolvedValue([]);

    render(<ObjectiveChooser {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/No curriculum objectives available/i)).toBeInTheDocument();
    });
  });

  it("should show error state on API failure", async () => {
    vi.mocked(generationApi.getRecommendedObjectives).mockRejectedValue(new Error("API Error"));

    render(<ObjectiveChooser {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load learning objectives/i)).toBeInTheDocument();
    });
  });

  it("should clear search and reload recommendations", async () => {
    const user = userEvent.setup();

    render(<ObjectiveChooser {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search objectives/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search objectives/i);
    await user.type(searchInput, "test");

    // Clear button should appear
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /clear/i }));

    // Should reload recommendations
    expect(generationApi.getRecommendedObjectives).toHaveBeenCalledTimes(2);
  });

  it("should fetch new objectives when grade changes", async () => {
    const { rerender } = render(<ObjectiveChooser {...defaultProps} />);

    await waitFor(() => {
      expect(generationApi.getRecommendedObjectives).toHaveBeenCalledWith(
        "1",
        "Math",
        "test-token",
        { count: 5 }
      );
    });

    rerender(<ObjectiveChooser {...defaultProps} grade="2" />);

    await waitFor(() => {
      expect(generationApi.getRecommendedObjectives).toHaveBeenCalledWith(
        "2",
        "Math",
        "test-token",
        { count: 5 }
      );
    });
  });

  it("should fetch new objectives when subject changes", async () => {
    const { rerender } = render(<ObjectiveChooser {...defaultProps} />);

    await waitFor(() => {
      expect(generationApi.getRecommendedObjectives).toHaveBeenCalled();
    });

    rerender(<ObjectiveChooser {...defaultProps} subject="Reading" />);

    await waitFor(() => {
      expect(generationApi.getRecommendedObjectives).toHaveBeenCalledWith(
        "1",
        "Reading",
        "test-token",
        { count: 5 }
      );
    });
  });

  it("should trigger search on Enter key press", async () => {
    const user = userEvent.setup();
    vi.mocked(generationApi.searchObjectives).mockResolvedValue([mockObjectives[0]]);

    render(<ObjectiveChooser {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search objectives/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search objectives/i);
    await user.type(searchInput, "addition{Enter}");

    await waitFor(() => {
      expect(generationApi.searchObjectives).toHaveBeenCalled();
    });
  });
});

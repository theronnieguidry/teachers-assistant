import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import { LibraryFilters, ActiveFilterChips } from "@/components/library/LibraryFilters";

// Mock stores - handle both selector and destructuring patterns
const defaultFilters = {
  projects: [] as string[],
  grades: [] as string[],
  subjects: [] as string[],
  types: [] as string[],
  objectiveTags: [] as string[],
  dateRange: undefined as { from: string; to: string } | undefined,
};

let mockFilters = { ...defaultFilters };
const mockSetFilters = vi.fn();
const mockClearFilters = vi.fn();

vi.mock("@/stores/artifactStore", () => ({
  useArtifactStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      filters: mockFilters,
      setFilters: mockSetFilters,
      clearFilters: mockClearFilters,
    };
    if (typeof selector === "function") return selector(state);
    return state;
  }),
}));

vi.mock("@/stores/unifiedProjectStore", () => ({
  useUnifiedProjectStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      projects: [
        { projectId: "proj-1", name: "Math Project" },
        { projectId: "proj-2", name: "Science Project" },
      ],
    };
    if (typeof selector === "function") return selector(state);
    return state;
  }),
}));

vi.mock("@/stores/designPackStore", () => ({
  useDesignPackStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      packs: [{ packId: "pack-1", name: "Fun Design Pack" }],
    };
    if (typeof selector === "function") return selector(state);
    return state;
  }),
}));

describe("LibraryFilters", () => {
  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFilters = { ...defaultFilters };
  });

  it("should render the Project filter label", () => {
    render(<LibraryFilters onFilterChange={mockOnFilterChange} />);
    expect(screen.getByText("Project")).toBeInTheDocument();
  });

  it("should render grade filter badges", () => {
    render(<LibraryFilters onFilterChange={mockOnFilterChange} />);
    expect(screen.getByText("Grade")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should render subject filter section", () => {
    render(<LibraryFilters onFilterChange={mockOnFilterChange} />);
    expect(screen.getByText("Subject")).toBeInTheDocument();
  });

  it("should render type filter section", () => {
    render(<LibraryFilters onFilterChange={mockOnFilterChange} />);
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Student Page")).toBeInTheDocument();
    expect(screen.getByText("Teacher Script")).toBeInTheDocument();
    expect(screen.getByText("Answer Key")).toBeInTheDocument();
  });

  it("should render objective tags section", () => {
    render(<LibraryFilters onFilterChange={mockOnFilterChange} />);
    expect(screen.getByText("Objective Tags")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type tag and press Enter...")).toBeInTheDocument();
  });

  it("should render date range section", () => {
    render(<LibraryFilters onFilterChange={mockOnFilterChange} />);
    expect(screen.getByText("Date Range")).toBeInTheDocument();
  });

  it("should render design pack filter when packs exist", () => {
    render(<LibraryFilters onFilterChange={mockOnFilterChange} />);
    expect(screen.getByText("Design Pack")).toBeInTheDocument();
  });

  it("should not show Clear Filters button when no filters active", () => {
    render(<LibraryFilters onFilterChange={mockOnFilterChange} />);
    expect(screen.queryByText("Clear Filters")).not.toBeInTheDocument();
  });

  it("should show Clear Filters button when filters are active", () => {
    mockFilters = { ...defaultFilters, grades: ["2"] };
    render(<LibraryFilters onFilterChange={mockOnFilterChange} />);
    expect(screen.getByText("Clear Filters")).toBeInTheDocument();
  });
});

describe("ActiveFilterChips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFilters = { ...defaultFilters };
  });

  it("should render nothing when no filters active", () => {
    const { container } = render(<ActiveFilterChips />);
    expect(container.firstChild).toBeNull();
  });

  it("should render grade chips when grades are filtered", () => {
    mockFilters = { ...defaultFilters, grades: ["K", "2"] };
    render(<ActiveFilterChips />);
    expect(screen.getByText("Grade K")).toBeInTheDocument();
    expect(screen.getByText("Grade 2")).toBeInTheDocument();
  });

  it("should render subject chips when subjects are filtered", () => {
    mockFilters = { ...defaultFilters, subjects: ["Math"] };
    render(<ActiveFilterChips />);
    expect(screen.getByText("Math")).toBeInTheDocument();
  });

  it("should render objective tag chips", () => {
    mockFilters = { ...defaultFilters, objectiveTags: ["K.MATH.COUNT"] };
    render(<ActiveFilterChips />);
    expect(screen.getByText("K.MATH.COUNT")).toBeInTheDocument();
  });

  it("should render date range chip", () => {
    mockFilters = {
      ...defaultFilters,
      dateRange: { from: "2026-01-01", to: "2026-01-31" },
    };
    render(<ActiveFilterChips />);
    expect(screen.getByText("2026-01-01 - 2026-01-31")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import userEvent from "@testing-library/user-event";
import { LibraryView } from "@/components/library/LibraryView";
import type { ArtifactType, Grade } from "@/types";

// Default store state
const defaultArtifactState = {
  isLoading: false,
  error: null as string | null,
  viewMode: "grid" as const,
  sortBy: "date_desc" as const,
  searchQuery: "",
  currentArtifact: null,
  loadArtifacts: vi.fn(),
  loadArtifact: vi.fn(),
  deleteArtifact: vi.fn(),
  setViewMode: vi.fn(),
  setSortBy: vi.fn(),
  setSearchQuery: vi.fn(),
  setCurrentArtifact: vi.fn(),
};

let artifactStoreState = { ...defaultArtifactState };
let filteredArtifacts: Array<{
  artifactId: string;
  projectId: string;
  jobId: string;
  type: ArtifactType;
  title: string;
  grade: Grade;
  subject: string;
  objectiveTags: string[];
  createdAt: string;
}> = [];

vi.mock("@/stores/artifactStore", () => ({
  useArtifactStore: vi.fn((selector?: (state: unknown) => unknown) => {
    if (typeof selector === "function") return selector(artifactStoreState);
    return artifactStoreState;
  }),
  useFilteredArtifacts: vi.fn(() => filteredArtifacts),
}));

vi.mock("@/stores/unifiedProjectStore", () => ({
  useUnifiedProjectStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = { projects: [], loadProjects: vi.fn() };
    if (typeof selector === "function") return selector(state);
    return state;
  }),
}));

// Mock child components to avoid deep rendering
vi.mock("@/components/library/LibraryFilters", () => ({
  LibraryFilters: () => <div data-testid="library-filters">Filters</div>,
  ActiveFilterChips: () => <div data-testid="active-filter-chips">Chips</div>,
}));

vi.mock("@/components/preview/PreviewTabs", () => ({
  StandardizedPreviewTabs: () => <div data-testid="preview-tabs">Preview</div>,
}));

const mockArtifact = {
  artifactId: "art-1",
  projectId: "proj-1",
  jobId: "job-1",
  type: "student_page" as ArtifactType,
  title: "Math Worksheet",
  grade: "2" as Grade,
  subject: "Math",
  objectiveTags: [],
  createdAt: "2026-01-15T10:00:00Z",
};

const mockArtifact2 = {
  ...mockArtifact,
  artifactId: "art-2",
  title: "Science Worksheet",
  subject: "Science",
  type: "answer_key" as ArtifactType,
};

describe("LibraryView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    artifactStoreState = { ...defaultArtifactState };
    filteredArtifacts = [];
  });

  it("should render the Library heading", () => {
    render(<LibraryView />);
    expect(screen.getByText("Library")).toBeInTheDocument();
  });

  it("should render the description text", () => {
    render(<LibraryView />);
    expect(
      screen.getByText("Browse all your generated teaching materials")
    ).toBeInTheDocument();
  });

  it("should render search input", () => {
    render(<LibraryView />);
    expect(
      screen.getByPlaceholderText("Search materials...")
    ).toBeInTheDocument();
  });

  it("should call loadArtifacts on mount", () => {
    render(<LibraryView />);
    expect(artifactStoreState.loadArtifacts).toHaveBeenCalled();
  });

  it("should show loading spinner when loading", () => {
    artifactStoreState = { ...defaultArtifactState, isLoading: true };
    render(<LibraryView />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("should show empty state when no artifacts and not loading", () => {
    filteredArtifacts = [];
    render(<LibraryView />);
    expect(screen.getByText("No materials found")).toBeInTheDocument();
  });

  it("should show search hint in empty state when search is active", () => {
    artifactStoreState = { ...defaultArtifactState, searchQuery: "test" };
    filteredArtifacts = [];
    render(<LibraryView />);
    expect(
      screen.getByText("Try adjusting your search or filters")
    ).toBeInTheDocument();
  });

  it("should show generate hint in empty state when no search", () => {
    filteredArtifacts = [];
    render(<LibraryView />);
    expect(
      screen.getByText("Generate some teaching materials to see them here")
    ).toBeInTheDocument();
  });

  it("should render artifact count when artifacts exist", () => {
    filteredArtifacts = [mockArtifact, mockArtifact2];
    render(<LibraryView />);
    expect(screen.getByText("2 items")).toBeInTheDocument();
  });

  it("should render singular item count", () => {
    filteredArtifacts = [mockArtifact];
    render(<LibraryView />);
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("should render artifacts in grid mode by default", () => {
    filteredArtifacts = [mockArtifact];
    render(<LibraryView />);
    expect(screen.getByText("Math Worksheet")).toBeInTheDocument();
  });

  it("should show error state with retry button", () => {
    artifactStoreState = {
      ...defaultArtifactState,
      error: "Failed to load",
    };
    render(<LibraryView />);
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("should call loadArtifacts when Try Again is clicked", async () => {
    const user = userEvent.setup();
    artifactStoreState = {
      ...defaultArtifactState,
      error: "Failed to load",
    };
    render(<LibraryView />);
    await user.click(screen.getByText("Try Again"));
    expect(artifactStoreState.loadArtifacts).toHaveBeenCalled();
  });

  it("should update search query on input change", async () => {
    const user = userEvent.setup();
    render(<LibraryView />);
    const input = screen.getByPlaceholderText("Search materials...");
    await user.type(input, "math");
    expect(artifactStoreState.setSearchQuery).toHaveBeenCalled();
  });

  it("should render active filter chips", () => {
    render(<LibraryView />);
    expect(screen.getByTestId("active-filter-chips")).toBeInTheDocument();
  });
});

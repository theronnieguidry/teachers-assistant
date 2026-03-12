import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import userEvent from "@testing-library/user-event";
import { LibraryView } from "@/components/library/LibraryView";
import type { ArtifactType, Grade } from "@/types";

const { mockUseArtifactStore, mockFetchProjects } = vi.hoisted(() => {
  const mockedStore = vi.fn();
  (mockedStore as typeof mockedStore & { getState: () => unknown }).getState = () => ({});
  return {
    mockUseArtifactStore: mockedStore,
    mockFetchProjects: vi.fn(),
  };
});

// Default store state
const defaultArtifactState = {
  artifacts: [] as Array<{
    artifactId: string;
    projectId: string;
    jobId: string;
    type: ArtifactType;
    title: string;
    grade: Grade;
    subject: string;
    objectiveTags: string[];
    createdAt: string;
  }>,
  isLoading: false,
  error: null as string | null,
  viewMode: "grid" as const,
  sortBy: "date_desc" as const,
  filters: {
    projects: [],
    grades: [],
    subjects: [],
    types: [],
    objectiveTags: [],
  },
  searchQuery: "",
  currentArtifact: null,
  loadArtifacts: vi.fn(),
  loadArtifact: vi.fn(),
  loadArtifactsByJob: vi.fn().mockResolvedValue([]),
  deleteArtifact: vi.fn(),
  updateTags: vi.fn(),
  setViewMode: vi.fn(),
  setSortBy: vi.fn(),
  setSearchQuery: vi.fn(),
  setCurrentArtifact: vi.fn(),
};

let artifactStoreState: any = { ...defaultArtifactState };
mockUseArtifactStore.mockImplementation((selector?: (state: unknown) => unknown) => {
  if (typeof selector === "function") return selector(artifactStoreState);
  return artifactStoreState;
});
const mockUseArtifactStoreWithState = mockUseArtifactStore as typeof mockUseArtifactStore & {
  getState: () => unknown;
};
mockUseArtifactStoreWithState.getState = () => artifactStoreState;

vi.mock("@/stores/artifactStore", () => ({
  useArtifactStore: mockUseArtifactStore,
  filterArtifacts: vi.fn(
    ({
      artifacts,
      searchQuery,
    }: {
      artifacts: typeof defaultArtifactState.artifacts;
      searchQuery: string;
    }) =>
      artifacts.filter((artifact) =>
        artifact.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
  ),
}));

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = { fetchProjects: mockFetchProjects };
    if (typeof selector === "function") return selector(state);
    return state;
  }),
}));

vi.mock("@/lib/curriculum", () => ({
  getObjectiveById: vi.fn((objectiveId: string) => ({
    subject: "Math",
    unit: { id: "unit-1", title: "Addition Basics", grade: "2", sequence: 1, objectives: [] },
    objective: { id: objectiveId, text: "Solve addition problems within 20" },
  })),
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
    mockUseArtifactStore.mockImplementation((selector?: (state: unknown) => unknown) => {
      if (typeof selector === "function") return selector(artifactStoreState);
      return artifactStoreState;
    });
    mockUseArtifactStoreWithState.getState = () => artifactStoreState;
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
    render(<LibraryView />);
    expect(screen.getByText("No materials found")).toBeInTheDocument();
  });

  it("should show search hint in empty state when search is active", () => {
    artifactStoreState = { ...defaultArtifactState, searchQuery: "test" };
    render(<LibraryView />);
    expect(
      screen.getByText("Try adjusting your search or filters")
    ).toBeInTheDocument();
  });

  it("should show generate hint in empty state when no search", () => {
    render(<LibraryView />);
    expect(
      screen.getByText("Generate some teaching materials to see them here")
    ).toBeInTheDocument();
  });

  it("should render artifact count when artifacts exist", () => {
    artifactStoreState = {
      ...defaultArtifactState,
      artifacts: [mockArtifact, mockArtifact2],
    };
    render(<LibraryView />);
    expect(screen.getByText("2 items")).toBeInTheDocument();
  });

  it("should render singular item count", () => {
    artifactStoreState = {
      ...defaultArtifactState,
      artifacts: [mockArtifact],
    };
    render(<LibraryView />);
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("should render artifacts in grid mode by default", () => {
    artifactStoreState = {
      ...defaultArtifactState,
      artifacts: [mockArtifact],
    };
    render(<LibraryView />);
    expect(screen.getByText("Math Worksheet")).toBeInTheDocument();
  });

  it("should derive filtered artifacts from raw store state", () => {
    artifactStoreState = {
      ...defaultArtifactState,
      artifacts: [mockArtifact, mockArtifact2],
      searchQuery: "science",
    };
    render(<LibraryView />);
    expect(screen.getByText("Science Worksheet")).toBeInTheDocument();
    expect(screen.queryByText("Math Worksheet")).not.toBeInTheDocument();
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

  it("shows objective backlink in preview and routes back to learning path", async () => {
    const user = userEvent.setup();
    const handleNavigateToObjective = vi.fn();
    const artifactWithObjective = {
      ...mockArtifact,
      objectiveId: "math_2_01",
    };

    artifactStoreState = {
      ...defaultArtifactState,
      artifacts: [artifactWithObjective],
      loadArtifact: vi.fn(async () => {
        const fullArtifact = {
          ...artifactWithObjective,
          htmlContent: "<p>Worksheet</p>",
        };
        artifactStoreState.currentArtifact = fullArtifact;
        return fullArtifact;
      }),
      loadArtifactsByJob: vi.fn().mockResolvedValue([
        {
          ...artifactWithObjective,
          htmlContent: "<p>Worksheet</p>",
        },
      ]),
    };
    mockUseArtifactStoreWithState.getState = () => artifactStoreState;

    render(<LibraryView onNavigateToObjective={handleNavigateToObjective} />);

    await user.click(screen.getByRole("button", { name: /view/i }));

    expect(await screen.findByText("Linked objective")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /back to objective/i }));

    expect(handleNavigateToObjective).toHaveBeenCalledWith("math_2_01", "Math");
  });
});

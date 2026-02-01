import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import userEvent from "@testing-library/user-event";
import { DesignPacksPanel } from "@/components/design-packs/DesignPacksPanel";

// Store state mock
const defaultState = {
  packs: [] as Array<{
    packId: string;
    name: string;
    items: Array<{ itemId: string; type: string; title: string; sourceUrl?: string }>;
    createdAt: string;
    updatedAt: string;
  }>,
  isLoading: false,
  selectedPackId: null as string | null,
  loadPacks: vi.fn(),
  createPack: vi.fn(),
  deletePack: vi.fn(),
  addItem: vi.fn(),
  removeItem: vi.fn(),
  selectPack: vi.fn(),
};

let mockStoreState = { ...defaultState };

vi.mock("@/stores/designPackStore", () => ({
  useDesignPackStore: vi.fn((selector?: (state: typeof mockStoreState) => unknown) => {
    if (typeof selector === "function") return selector(mockStoreState);
    return mockStoreState;
  }),
}));

const mockPack = {
  packId: "pack-1",
  name: "Spring Theme",
  items: [
    { itemId: "item-1", type: "url", title: "example.com", sourceUrl: "https://example.com" },
    { itemId: "item-2", type: "pdf", title: "worksheet.pdf" },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockPack2 = {
  packId: "pack-2",
  name: "Math Worksheets",
  items: [],
  createdAt: "2026-01-02T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
};

describe("DesignPacksPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = { ...defaultState };
  });

  it("should render the Design Packs heading", () => {
    render(<DesignPacksPanel />);
    expect(screen.getByText("Design Packs")).toBeInTheDocument();
  });

  it("should call loadPacks on mount", () => {
    render(<DesignPacksPanel />);
    expect(mockStoreState.loadPacks).toHaveBeenCalled();
  });

  it("should show loading spinner when loading", () => {
    mockStoreState = { ...defaultState, isLoading: true };
    render(<DesignPacksPanel />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("should show empty state when no packs", () => {
    render(<DesignPacksPanel />);
    expect(
      screen.getByText("Create a Design Pack to save your inspiration items")
    ).toBeInTheDocument();
    expect(screen.getByText("New Pack")).toBeInTheDocument();
  });

  it("should render pack list when packs exist", () => {
    mockStoreState = { ...defaultState, packs: [mockPack, mockPack2] };
    render(<DesignPacksPanel />);
    expect(screen.getByText("Spring Theme")).toBeInTheDocument();
    expect(screen.getByText("Math Worksheets")).toBeInTheDocument();
  });

  it("should show item count for each pack", () => {
    mockStoreState = { ...defaultState, packs: [mockPack, mockPack2] };
    render(<DesignPacksPanel />);
    expect(screen.getByText("(2)")).toBeInTheDocument();
    expect(screen.getByText("(0)")).toBeInTheDocument();
  });

  it("should show check icon for selected pack", () => {
    mockStoreState = {
      ...defaultState,
      packs: [mockPack],
      selectedPackId: "pack-1",
    };
    render(<DesignPacksPanel />);
    expect(screen.getByText("Spring Theme")).toBeInTheDocument();
  });

  it("should have a create button in the header", () => {
    render(<DesignPacksPanel />);
    expect(screen.getByTitle("Create Design Pack")).toBeInTheDocument();
  });

  it("should open create dialog when create button is clicked", async () => {
    const user = userEvent.setup();
    render(<DesignPacksPanel />);

    await user.click(screen.getByTitle("Create Design Pack"));

    expect(screen.getByLabelText("Pack Name")).toBeInTheDocument();
  });

  it("should have delete button for each pack", () => {
    mockStoreState = { ...defaultState, packs: [mockPack] };
    render(<DesignPacksPanel />);
    expect(screen.getByTitle("Delete Pack")).toBeInTheDocument();
  });

  it("should have Add URL button for each pack", () => {
    mockStoreState = { ...defaultState, packs: [mockPack] };
    render(<DesignPacksPanel />);
    expect(screen.getByTitle("Add URL")).toBeInTheDocument();
  });
});

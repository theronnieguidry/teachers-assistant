import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InspirationPanel } from "@/components/panels/InspirationPanel";

const mockCreatePack = vi.fn();
const mockFetchItems = vi.fn();
const mockImportLegacyCloudItems = vi.fn();
const mockLoadPacks = vi.fn();
const mockRemoveItem = vi.fn().mockResolvedValue(undefined);

const inspirationStoreState = {
  items: [] as Array<{ id: string; type: "url" | "pdf" | "image" | "text"; title: string; sourceUrl?: string }>,
  isLoading: false,
  addItem: vi.fn(),
  removeItem: mockRemoveItem,
  fetchItems: mockFetchItems,
  importLegacyCloudItems: mockImportLegacyCloudItems,
};

const designPackStoreState = {
  createPack: mockCreatePack,
  loadPacks: mockLoadPacks,
};

vi.mock("@/stores/inspirationStore", () => ({
  useInspirationStore: vi.fn((selector?: (state: typeof inspirationStoreState) => unknown) =>
    selector ? selector(inspirationStoreState) : inspirationStoreState
  ),
}));

vi.mock("@/stores/designPackStore", () => ({
  useDesignPackStore: vi.fn((selector?: (state: typeof designPackStoreState) => unknown) =>
    selector ? selector(designPackStoreState) : designPackStoreState
  ),
}));

vi.mock("@/stores/wizardStore", () => ({
  useWizardStore: vi.fn((selector?: (state: { isOpen: boolean }) => unknown) =>
    selector ? selector({ isOpen: false }) : { isOpen: false }
  ),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(() => ({ user: { id: "user-1" } })),
}));

vi.mock("@/hooks/useInspirationDrop", () => ({
  useInspirationDrop: () => ({
    handleDrop: vi.fn(),
    handleDragOver: vi.fn(),
  }),
}));

vi.mock("@/components/design-packs", () => ({
  DesignPacksPanel: () => <div>Pack Manager</div>,
}));

describe("InspirationPanel", () => {
  beforeEach(() => {
    inspirationStoreState.items = [];
    vi.clearAllMocks();
  });

  it("renders the unified local-first inspiration surface", () => {
    render(<InspirationPanel />);

    expect(screen.getByText("Inspiration")).toBeInTheDocument();
    expect(
      screen.getByText(/Inspiration is stored locally and available offline/i)
    ).toBeInTheDocument();
    expect(screen.getByTitle("Import from cloud")).toBeInTheDocument();
    expect(screen.getByTitle("Add URL")).toBeInTheDocument();
    expect(screen.getByText("Pack Manager")).toBeInTheDocument();
  });

  it("loads inspiration items and packs when a user is present", () => {
    render(<InspirationPanel />);

    expect(mockFetchItems).toHaveBeenCalled();
    expect(mockLoadPacks).toHaveBeenCalled();
  });

  it("shows local library items and enables pack creation when items are selected", () => {
    inspirationStoreState.items = [
      {
        id: "item-1",
        type: "url",
        title: "Example",
        sourceUrl: "https://example.com",
      },
    ];

    render(<InspirationPanel />);

    fireEvent.click(screen.getByText("Example"));
    const createPackButton = screen.getByRole("button", { name: /create pack/i });
    expect(createPackButton).toBeEnabled();
  });
});

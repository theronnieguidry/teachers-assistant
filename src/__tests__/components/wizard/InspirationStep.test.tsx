import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InspirationStep } from "@/components/wizard/InspirationStep";

const mockSetSelectedInspirationIds = vi.fn();
const mockNextStep = vi.fn();
const mockPrevStep = vi.fn();
const mockFetchItems = vi.fn();
const mockAddItem = vi.fn();

const wizardState = {
  selectedInspirationIds: [] as string[],
  setSelectedInspirationIds: mockSetSelectedInspirationIds,
  nextStep: mockNextStep,
  prevStep: mockPrevStep,
};

const inspirationStoreState = {
  items: [
    {
      id: "item-1",
      type: "url" as const,
      title: "Example Link",
      sourceUrl: "https://example.com",
    },
  ],
  isLoading: false,
  addItem: mockAddItem,
  fetchItems: mockFetchItems,
};

const designPackStoreState = {
  getSelectedPack: () => null,
};

vi.mock("@/stores/wizardStore", () => ({
  useWizardStore: vi.fn((selector?: (state: typeof wizardState) => unknown) =>
    selector ? selector(wizardState) : wizardState
  ),
}));

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

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(() => ({ user: { id: "user-1" } })),
}));

vi.mock("@/hooks/useInspirationDrop", () => ({
  useInspirationDrop: () => ({
    isDragging: false,
    handleDrop: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
  }),
}));

describe("InspirationStep", () => {
  beforeEach(() => {
    wizardState.selectedInspirationIds = [];
    designPackStoreState.getSelectedPack = () => null;
    vi.clearAllMocks();
  });

  it("shows Skip when no inspiration is selected", () => {
    render(<InspirationStep />);

    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
  });

  it("shows Next when inspiration ids are already selected", () => {
    wizardState.selectedInspirationIds = ["item-1"];

    render(<InspirationStep />);

    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.getByText("1 item selected")).toBeInTheDocument();
  });

  it("stores selected inspiration ids when an item is clicked", () => {
    render(<InspirationStep />);

    fireEvent.click(screen.getByText("Example Link"));

    expect(mockSetSelectedInspirationIds).toHaveBeenCalledWith(["item-1"]);
  });

  it("shows the selected pack summary when a pack is active", () => {
    designPackStoreState.getSelectedPack = () => ({
      packId: "pack-1",
      name: "Spring Pack",
      items: [{ id: "pack-item-1", type: "pdf", title: "Teacher Notes" }],
      createdAt: "2026-04-10T10:00:00.000Z",
      updatedAt: "2026-04-10T10:00:00.000Z",
    });

    render(<InspirationStep />);

    expect(screen.getByText("Selected Pack: Spring Pack")).toBeInTheDocument();
  });
});

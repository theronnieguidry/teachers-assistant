import { describe, it, expect, beforeEach, vi } from "vitest";
import { useDesignPackStore } from "@/stores/designPackStore";

// Mock design-pack-storage service
vi.mock("@/services/design-pack-storage", () => ({
  getDesignPacks: vi.fn().mockResolvedValue([]),
  getDesignPack: vi.fn().mockResolvedValue(null),
  createDesignPack: vi.fn(),
  updateDesignPack: vi.fn(),
  deleteDesignPack: vi.fn().mockResolvedValue(undefined),
  addItemToDesignPack: vi.fn(),
  removeItemFromDesignPack: vi.fn().mockResolvedValue(undefined),
  reorderDesignPackItems: vi.fn().mockResolvedValue(undefined),
  createDesignPackFromLegacyItems: vi.fn(),
}));

import {
  getDesignPacks,
  getDesignPack,
  createDesignPack,
  updateDesignPack,
  deleteDesignPack,
  addItemToDesignPack,
  removeItemFromDesignPack,
  reorderDesignPackItems,
  createDesignPackFromLegacyItems,
} from "@/services/design-pack-storage";

const mockPack = {
  packId: "pack-1",
  name: "Test Pack",
  items: [],
  parsedSummary: undefined,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockPack2 = {
  packId: "pack-2",
  name: "Second Pack",
  items: [
    {
      itemId: "item-1",
      type: "url" as const,
      source: "https://example.com",
      title: "Example",
    },
  ],
  parsedSummary: undefined,
  createdAt: "2026-01-02T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
};

describe("designPackStore", () => {
  beforeEach(() => {
    useDesignPackStore.getState().reset();
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = useDesignPackStore.getState();
      expect(state.packs).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.currentPackId).toBeNull();
      expect(state.currentPack).toBeNull();
      expect(state.selectedPackId).toBeNull();
    });
  });

  describe("loadPacks", () => {
    it("should load packs from storage", async () => {
      vi.mocked(getDesignPacks).mockResolvedValue([mockPack, mockPack2]);

      await useDesignPackStore.getState().loadPacks();

      const state = useDesignPackStore.getState();
      expect(state.packs).toHaveLength(2);
      expect(state.packs[0].packId).toBe("pack-1");
      expect(state.isLoading).toBe(false);
    });

    it("should set error on failure", async () => {
      vi.mocked(getDesignPacks).mockRejectedValue(new Error("Load failed"));

      await useDesignPackStore.getState().loadPacks();

      const state = useDesignPackStore.getState();
      expect(state.error).toBe("Load failed");
      expect(state.isLoading).toBe(false);
    });
  });

  describe("createPack", () => {
    it("should create a pack and add it to the list", async () => {
      vi.mocked(createDesignPack).mockResolvedValue(mockPack);

      const result = await useDesignPackStore
        .getState()
        .createPack({ name: "Test Pack" });

      expect(result.packId).toBe("pack-1");
      expect(useDesignPackStore.getState().packs).toHaveLength(1);
    });

    it("should set error on failure", async () => {
      vi.mocked(createDesignPack).mockRejectedValue(
        new Error("Create failed")
      );

      await expect(
        useDesignPackStore.getState().createPack({ name: "Test Pack" })
      ).rejects.toThrow("Create failed");

      expect(useDesignPackStore.getState().error).toBe("Create failed");
    });
  });

  describe("updatePack", () => {
    it("should update a pack in the list", async () => {
      // Pre-populate
      useDesignPackStore.setState({ packs: [mockPack] });

      const updated = { ...mockPack, name: "Updated Pack" };
      vi.mocked(updateDesignPack).mockResolvedValue(updated);

      await useDesignPackStore
        .getState()
        .updatePack("pack-1", { name: "Updated Pack" });

      const state = useDesignPackStore.getState();
      expect(state.packs[0].name).toBe("Updated Pack");
    });
  });

  describe("deletePack", () => {
    it("should remove a pack from the list", async () => {
      useDesignPackStore.setState({ packs: [mockPack, mockPack2] });

      await useDesignPackStore.getState().deletePack("pack-1");

      const state = useDesignPackStore.getState();
      expect(state.packs).toHaveLength(1);
      expect(state.packs[0].packId).toBe("pack-2");
    });

    it("should clear currentPackId if deleted pack was current", async () => {
      useDesignPackStore.setState({
        packs: [mockPack],
        currentPackId: "pack-1",
        currentPack: mockPack,
      });

      await useDesignPackStore.getState().deletePack("pack-1");

      const state = useDesignPackStore.getState();
      expect(state.currentPackId).toBeNull();
      expect(state.currentPack).toBeNull();
    });

    it("should clear selectedPackId if deleted pack was selected", async () => {
      useDesignPackStore.setState({
        packs: [mockPack],
        selectedPackId: "pack-1",
      });

      await useDesignPackStore.getState().deletePack("pack-1");

      expect(useDesignPackStore.getState().selectedPackId).toBeNull();
    });
  });

  describe("addItem", () => {
    it("should add an item and reload the pack", async () => {
      const newItem = {
        itemId: "item-new",
        type: "url" as const,
        source: "https://example.com",
        title: "New Item",
      };
      const updatedPack = { ...mockPack, items: [newItem] };

      vi.mocked(addItemToDesignPack).mockResolvedValue(newItem);
      vi.mocked(getDesignPack).mockResolvedValue(updatedPack);
      useDesignPackStore.setState({ packs: [mockPack] });

      await useDesignPackStore.getState().addItem("pack-1", {
        type: "url",
        source: "https://example.com",
        title: "New Item",
      });

      const state = useDesignPackStore.getState();
      expect(state.packs[0].items).toHaveLength(1);
    });
  });

  describe("removeItem", () => {
    it("should remove an item and reload the pack", async () => {
      const updatedPack = { ...mockPack2, items: [] };
      vi.mocked(getDesignPack).mockResolvedValue(updatedPack);
      useDesignPackStore.setState({ packs: [mockPack2] });

      await useDesignPackStore.getState().removeItem("pack-2", "item-1");

      expect(removeItemFromDesignPack).toHaveBeenCalledWith("pack-2", "item-1");
    });
  });

  describe("reorderItems", () => {
    it("should reorder items and reload the pack", async () => {
      vi.mocked(getDesignPack).mockResolvedValue(mockPack2);
      useDesignPackStore.setState({ packs: [mockPack2] });

      await useDesignPackStore
        .getState()
        .reorderItems("pack-2", ["item-1"]);

      expect(reorderDesignPackItems).toHaveBeenCalledWith("pack-2", [
        "item-1",
      ]);
    });
  });

  describe("selection state", () => {
    it("selectPack should set selectedPackId", () => {
      useDesignPackStore.getState().selectPack("pack-1");
      expect(useDesignPackStore.getState().selectedPackId).toBe("pack-1");
    });

    it("selectPack(null) should clear selection", () => {
      useDesignPackStore.setState({ selectedPackId: "pack-1" });
      useDesignPackStore.getState().selectPack(null);
      expect(useDesignPackStore.getState().selectedPackId).toBeNull();
    });

    it("setCurrentPack should set currentPackId and currentPack", () => {
      useDesignPackStore.setState({ packs: [mockPack] });
      useDesignPackStore.getState().setCurrentPack("pack-1");

      const state = useDesignPackStore.getState();
      expect(state.currentPackId).toBe("pack-1");
      expect(state.currentPack?.name).toBe("Test Pack");
    });

    it("setCurrentPack(null) should clear current pack", () => {
      useDesignPackStore.setState({
        currentPackId: "pack-1",
        currentPack: mockPack,
      });
      useDesignPackStore.getState().setCurrentPack(null);

      const state = useDesignPackStore.getState();
      expect(state.currentPackId).toBeNull();
      expect(state.currentPack).toBeNull();
    });
  });

  describe("computed helpers", () => {
    it("getPackById should return the pack", () => {
      useDesignPackStore.setState({ packs: [mockPack, mockPack2] });
      const pack = useDesignPackStore.getState().getPackById("pack-2");
      expect(pack?.name).toBe("Second Pack");
    });

    it("getPackById should return null for unknown ID", () => {
      useDesignPackStore.setState({ packs: [mockPack] });
      const pack = useDesignPackStore.getState().getPackById("unknown");
      expect(pack).toBeNull();
    });

    it("getSelectedPack should return the selected pack", () => {
      useDesignPackStore.setState({
        packs: [mockPack, mockPack2],
        selectedPackId: "pack-2",
      });
      const pack = useDesignPackStore.getState().getSelectedPack();
      expect(pack?.name).toBe("Second Pack");
    });

    it("getSelectedPack should return null when nothing selected", () => {
      useDesignPackStore.setState({ packs: [mockPack], selectedPackId: null });
      const pack = useDesignPackStore.getState().getSelectedPack();
      expect(pack).toBeNull();
    });
  });

  describe("createFromLegacyItems", () => {
    it("should create a pack from legacy items", async () => {
      vi.mocked(createDesignPackFromLegacyItems).mockResolvedValue(mockPack);

      const result = await useDesignPackStore
        .getState()
        .createFromLegacyItems("Legacy Pack", [
          { id: "1", type: "url", title: "Test", sourceUrl: "https://example.com" },
        ]);

      expect(result.packId).toBe("pack-1");
      expect(useDesignPackStore.getState().packs).toHaveLength(1);
    });
  });

  describe("reset", () => {
    it("should reset all state", () => {
      useDesignPackStore.setState({
        packs: [mockPack],
        isLoading: true,
        error: "Some error",
        currentPackId: "pack-1",
        currentPack: mockPack,
        selectedPackId: "pack-1",
      });

      useDesignPackStore.getState().reset();

      const state = useDesignPackStore.getState();
      expect(state.packs).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.currentPackId).toBeNull();
      expect(state.currentPack).toBeNull();
      expect(state.selectedPackId).toBeNull();
    });
  });

  describe("clearError", () => {
    it("should clear the error", () => {
      useDesignPackStore.setState({ error: "Some error" });
      useDesignPackStore.getState().clearError();
      expect(useDesignPackStore.getState().error).toBeNull();
    });
  });
});

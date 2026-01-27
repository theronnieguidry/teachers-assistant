import { create } from "zustand";
import type {
  DesignPack,
  DesignPackItem,
  CreateDesignPackData,
} from "@/types";
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

interface DesignPackState {
  // Design pack state
  packs: DesignPack[];
  isLoading: boolean;
  error: string | null;

  // Current pack for editing
  currentPackId: string | null;
  currentPack: DesignPack | null;

  // Selected pack for generation (wizard)
  selectedPackId: string | null;

  // Computed helpers
  getPackById: (packId: string) => DesignPack | null;
  getSelectedPack: () => DesignPack | null;

  // Pack CRUD actions
  loadPacks: () => Promise<void>;
  loadPack: (packId: string) => Promise<DesignPack | null>;
  createPack: (data: CreateDesignPackData) => Promise<DesignPack>;
  updatePack: (
    packId: string,
    updates: Partial<Omit<DesignPack, "packId" | "createdAt">>
  ) => Promise<void>;
  deletePack: (packId: string) => Promise<void>;

  // Item management actions
  addItem: (packId: string, item: Omit<DesignPackItem, "itemId">) => Promise<DesignPackItem>;
  removeItem: (packId: string, itemId: string) => Promise<void>;
  reorderItems: (packId: string, itemIds: string[]) => Promise<void>;

  // Migration actions
  createFromLegacyItems: (
    name: string,
    legacyItems: Array<{
      id: string;
      type: "url" | "pdf" | "image" | "text";
      title: string;
      sourceUrl?: string;
      content?: string;
      storagePath?: string;
    }>
  ) => Promise<DesignPack>;

  // Selection actions
  setCurrentPack: (packId: string | null) => void;
  selectPack: (packId: string | null) => void;

  // Utility actions
  clearError: () => void;
  reset: () => void;
}

export const useDesignPackStore = create<DesignPackState>()((set, get) => ({
  // Initial state
  packs: [],
  isLoading: false,
  error: null,
  currentPackId: null,
  currentPack: null,
  selectedPackId: null,

  // ============================================
  // Computed Helpers
  // ============================================

  getPackById: (packId: string) => {
    const { packs } = get();
    return packs.find((p) => p.packId === packId) || null;
  },

  getSelectedPack: () => {
    const { packs, selectedPackId } = get();
    if (!selectedPackId) return null;
    return packs.find((p) => p.packId === selectedPackId) || null;
  },

  // ============================================
  // Pack CRUD Actions
  // ============================================

  loadPacks: async () => {
    set({ isLoading: true, error: null });
    try {
      const packs = await getDesignPacks();
      set({ packs, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load design packs",
      });
    }
  },

  loadPack: async (packId: string) => {
    try {
      const pack = await getDesignPack(packId);
      if (pack) {
        set({ currentPack: pack, currentPackId: packId });
      }
      return pack;
    } catch (error) {
      console.error("Failed to load design pack:", error);
      return null;
    }
  },

  createPack: async (data: CreateDesignPackData) => {
    set({ isLoading: true, error: null });
    try {
      const pack = await createDesignPack(data);
      set((state) => ({
        packs: [...state.packs, pack],
        isLoading: false,
      }));
      return pack;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to create design pack",
      });
      throw error;
    }
  },

  updatePack: async (packId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateDesignPack(packId, updates);
      set((state) => ({
        packs: state.packs.map((p) => (p.packId === packId ? updated : p)),
        currentPack: state.currentPackId === packId ? updated : state.currentPack,
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to update design pack",
      });
      throw error;
    }
  },

  deletePack: async (packId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteDesignPack(packId);
      set((state) => ({
        packs: state.packs.filter((p) => p.packId !== packId),
        currentPackId: state.currentPackId === packId ? null : state.currentPackId,
        currentPack: state.currentPackId === packId ? null : state.currentPack,
        selectedPackId: state.selectedPackId === packId ? null : state.selectedPackId,
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to delete design pack",
      });
      throw error;
    }
  },

  // ============================================
  // Item Management Actions
  // ============================================

  addItem: async (packId: string, item: Omit<DesignPackItem, "itemId">) => {
    try {
      const newItem = await addItemToDesignPack(packId, item);

      // Reload pack to get updated state
      const updatedPack = await getDesignPack(packId);
      if (updatedPack) {
        set((state) => ({
          packs: state.packs.map((p) => (p.packId === packId ? updatedPack : p)),
          currentPack: state.currentPackId === packId ? updatedPack : state.currentPack,
        }));
      }

      return newItem;
    } catch (error) {
      console.error("Failed to add item to design pack:", error);
      throw error;
    }
  },

  removeItem: async (packId: string, itemId: string) => {
    try {
      await removeItemFromDesignPack(packId, itemId);

      // Reload pack to get updated state
      const updatedPack = await getDesignPack(packId);
      if (updatedPack) {
        set((state) => ({
          packs: state.packs.map((p) => (p.packId === packId ? updatedPack : p)),
          currentPack: state.currentPackId === packId ? updatedPack : state.currentPack,
        }));
      }
    } catch (error) {
      console.error("Failed to remove item from design pack:", error);
      throw error;
    }
  },

  reorderItems: async (packId: string, itemIds: string[]) => {
    try {
      await reorderDesignPackItems(packId, itemIds);

      // Reload pack to get updated state
      const updatedPack = await getDesignPack(packId);
      if (updatedPack) {
        set((state) => ({
          packs: state.packs.map((p) => (p.packId === packId ? updatedPack : p)),
          currentPack: state.currentPackId === packId ? updatedPack : state.currentPack,
        }));
      }
    } catch (error) {
      console.error("Failed to reorder design pack items:", error);
      throw error;
    }
  },

  // ============================================
  // Migration Actions
  // ============================================

  createFromLegacyItems: async (name, legacyItems) => {
    set({ isLoading: true, error: null });
    try {
      const pack = await createDesignPackFromLegacyItems(name, legacyItems);
      set((state) => ({
        packs: [...state.packs, pack],
        isLoading: false,
      }));
      return pack;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to create design pack from legacy items",
      });
      throw error;
    }
  },

  // ============================================
  // Selection Actions
  // ============================================

  setCurrentPack: (packId: string | null) => {
    if (packId) {
      const pack = get().getPackById(packId);
      set({ currentPackId: packId, currentPack: pack });
    } else {
      set({ currentPackId: null, currentPack: null });
    }
  },

  selectPack: (packId: string | null) => {
    set({ selectedPackId: packId });
  },

  // ============================================
  // Utility Actions
  // ============================================

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      packs: [],
      isLoading: false,
      error: null,
      currentPackId: null,
      currentPack: null,
      selectedPackId: null,
    }),
}));

// Export convenience selector hooks
export const useDesignPacks = () =>
  useDesignPackStore((state) => state.packs);

export const useSelectedDesignPack = () =>
  useDesignPackStore((state) => state.getSelectedPack());

export const useCurrentDesignPack = () =>
  useDesignPackStore((state) => state.currentPack);

import { create } from "zustand";
import type {
  CreateDesignPackData,
  DesignPack,
  InspirationItem,
} from "@/types";
import {
  addItemToDesignPack,
  createDesignPack,
  createDesignPackFromLegacyItems,
  deleteDesignPack,
  getDesignPack,
  getDesignPacks,
  removeItemFromDesignPack,
  reorderDesignPackItems,
  updateDesignPack,
} from "@/services/design-pack-storage";

function getPackWarnings(packs: DesignPack[]): Record<string, string[]> {
  return Object.fromEntries(
    packs
      .filter((pack) => (pack.missingItemIds?.length || 0) > 0)
      .map((pack) => [pack.packId, pack.missingItemIds || []])
  );
}

function mergePackWarning(
  currentWarnings: Record<string, string[]>,
  pack: DesignPack | null
): Record<string, string[]> {
  if (!pack) {
    return currentWarnings;
  }

  if (pack.missingItemIds && pack.missingItemIds.length > 0) {
    return {
      ...currentWarnings,
      [pack.packId]: pack.missingItemIds,
    };
  }

  return Object.fromEntries(
    Object.entries(currentWarnings).filter(([packId]) => packId !== pack.packId)
  );
}

interface DesignPackState {
  packs: DesignPack[];
  packWarnings: Record<string, string[]>;
  isLoading: boolean;
  error: string | null;
  currentPackId: string | null;
  currentPack: DesignPack | null;
  selectedPackId: string | null;
  selectedPackOrigin: "manual" | "project_default" | null;
  getPackById: (packId: string) => DesignPack | null;
  getSelectedPack: () => DesignPack | null;
  loadPacks: () => Promise<void>;
  loadPack: (packId: string) => Promise<DesignPack | null>;
  createPack: (data: CreateDesignPackData) => Promise<DesignPack>;
  updatePack: (
    packId: string,
    updates: Partial<Omit<DesignPack, "packId" | "createdAt">>
  ) => Promise<void>;
  deletePack: (packId: string) => Promise<void>;
  addItem: (packId: string, item: Omit<InspirationItem, "id">) => Promise<InspirationItem>;
  removeItem: (packId: string, itemId: string) => Promise<void>;
  reorderItems: (packId: string, itemIds: string[]) => Promise<void>;
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
  setCurrentPack: (packId: string | null) => void;
  selectPack: (packId: string | null, origin?: "manual" | "project_default") => void;
  clearError: () => void;
  reset: () => void;
}

export const useDesignPackStore = create<DesignPackState>()((set, get) => ({
  packs: [],
  packWarnings: {},
  isLoading: false,
  error: null,
  currentPackId: null,
  currentPack: null,
  selectedPackId: null,
  selectedPackOrigin: null,

  getPackById: (packId: string) => {
    const { packs } = get();
    return packs.find((pack) => pack.packId === packId) || null;
  },

  getSelectedPack: () => {
    const { packs, selectedPackId } = get();
    if (!selectedPackId) return null;
    return packs.find((pack) => pack.packId === selectedPackId) || null;
  },

  loadPacks: async () => {
    set({ isLoading: true, error: null });
    try {
      const packs = await getDesignPacks();
      set({
        packs,
        packWarnings: getPackWarnings(packs),
        isLoading: false,
      });
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
        set((state) => ({
          currentPack: pack,
          currentPackId: packId,
          packWarnings: mergePackWarning(state.packWarnings, pack),
        }));
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
        packWarnings: mergePackWarning(state.packWarnings, pack),
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
        packs: state.packs.map((pack) => (pack.packId === packId ? updated : pack)),
        currentPack: state.currentPackId === packId ? updated : state.currentPack,
        packWarnings: mergePackWarning(state.packWarnings, updated),
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
        packs: state.packs.filter((pack) => pack.packId !== packId),
        packWarnings: Object.fromEntries(
          Object.entries(state.packWarnings).filter(([id]) => id !== packId)
        ),
        currentPackId: state.currentPackId === packId ? null : state.currentPackId,
        currentPack: state.currentPackId === packId ? null : state.currentPack,
        selectedPackId: state.selectedPackId === packId ? null : state.selectedPackId,
        selectedPackOrigin:
          state.selectedPackId === packId ? null : state.selectedPackOrigin,
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

  addItem: async (packId: string, item: Omit<InspirationItem, "id">) => {
    try {
      const savedItem = await addItemToDesignPack(packId, item);
      const updatedPack = await getDesignPack(packId);
      if (updatedPack) {
        set((state) => ({
          packs: state.packs.map((pack) => (pack.packId === packId ? updatedPack : pack)),
          currentPack: state.currentPackId === packId ? updatedPack : state.currentPack,
          packWarnings: mergePackWarning(state.packWarnings, updatedPack),
        }));
      }
      return savedItem;
    } catch (error) {
      console.error("Failed to add item to design pack:", error);
      throw error;
    }
  },

  removeItem: async (packId: string, itemId: string) => {
    try {
      await removeItemFromDesignPack(packId, itemId);
      const updatedPack = await getDesignPack(packId);
      if (updatedPack) {
        set((state) => ({
          packs: state.packs.map((pack) => (pack.packId === packId ? updatedPack : pack)),
          currentPack: state.currentPackId === packId ? updatedPack : state.currentPack,
          packWarnings: mergePackWarning(state.packWarnings, updatedPack),
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
      const updatedPack = await getDesignPack(packId);
      if (updatedPack) {
        set((state) => ({
          packs: state.packs.map((pack) => (pack.packId === packId ? updatedPack : pack)),
          currentPack: state.currentPackId === packId ? updatedPack : state.currentPack,
          packWarnings: mergePackWarning(state.packWarnings, updatedPack),
        }));
      }
    } catch (error) {
      console.error("Failed to reorder design pack items:", error);
      throw error;
    }
  },

  createFromLegacyItems: async (name, legacyItems) => {
    set({ isLoading: true, error: null });
    try {
      const pack = await createDesignPackFromLegacyItems(name, legacyItems);
      set((state) => ({
        packs: [...state.packs, pack],
        packWarnings: mergePackWarning(state.packWarnings, pack),
        isLoading: false,
      }));
      return pack;
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create design pack from legacy items",
      });
      throw error;
    }
  },

  setCurrentPack: (packId: string | null) => {
    if (packId) {
      const pack = get().getPackById(packId);
      set({ currentPackId: packId, currentPack: pack });
    } else {
      set({ currentPackId: null, currentPack: null });
    }
  },

  selectPack: (packId: string | null, origin = "manual") => {
    set({
      selectedPackId: packId,
      selectedPackOrigin: packId ? origin : null,
    });
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      packs: [],
      packWarnings: {},
      isLoading: false,
      error: null,
      currentPackId: null,
      currentPack: null,
      selectedPackId: null,
      selectedPackOrigin: null,
    }),
}));

export const useDesignPacks = () => useDesignPackStore((state) => state.packs);

export const useSelectedDesignPack = () =>
  useDesignPackStore((state) => state.getSelectedPack());

export const useCurrentDesignPack = () =>
  useDesignPackStore((state) => state.currentPack);

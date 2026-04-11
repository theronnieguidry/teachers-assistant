import { create } from "zustand";
import { supabase } from "@/services/supabase";
import {
  bulkUpsertInspirationItems,
  deleteInspirationItem,
  getInspirationItems,
  saveInspirationItem,
} from "@/services/inspiration-storage";
import {
  createDesignPack,
  getDesignPacks,
  updateDesignPack,
} from "@/services/design-pack-storage";
import { mergeInspirationItems } from "@/lib/inspiration-merge";
import { toast } from "@/stores/toastStore";
import type { InspirationItem } from "@/types";
import type { InspirationType } from "@/types/database";

interface DbInspirationItem {
  id: string;
  user_id: string;
  type: InspirationType;
  title: string | null;
  source_url: string | null;
  content: string | null;
  storage_path: string | null;
  created_at: string;
}

function mapDbItemToItem(item: DbInspirationItem): InspirationItem {
  return {
    id: item.id,
    userId: item.user_id,
    type: item.type,
    title: item.title || "",
    sourceUrl: item.source_url || undefined,
    content: item.content || undefined,
    storagePath: item.storage_path || undefined,
    createdAt: new Date(item.created_at),
  };
}

function sortItems(items: InspirationItem[]): InspirationItem[] {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

interface InspirationState {
  items: InspirationItem[];
  isLoading: boolean;
  error: string | null;
  loadItems: () => Promise<void>;
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<InspirationItem, "id">) => Promise<InspirationItem>;
  updateItem: (id: string, data: Partial<InspirationItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  bulkUpsertItems: (items: InspirationItem[]) => Promise<InspirationItem[]>;
  importLegacyCloudItems: () => Promise<InspirationItem[]>;
  clearError: () => void;
}

export const useInspirationStore = create<InspirationState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  loadItems: async () => {
    try {
      set({ isLoading: true, error: null });
      const items = await getInspirationItems();
      set({ items: sortItems(items), isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load inspiration items";
      set({ error: message, isLoading: false });
    }
  },

  fetchItems: async () => {
    await get().loadItems();
  },

  addItem: async (itemData) => {
    try {
      set({ isLoading: true, error: null });

      const item = await saveInspirationItem({
        ...itemData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      });

      set((state) => ({
        items: sortItems([item, ...state.items.filter((existing) => existing.id !== item.id)]),
        isLoading: false,
      }));

      return item;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add inspiration item";
      set({ error: message, isLoading: false });
      toast.error("Failed to add item", message);
      throw error;
    }
  },

  updateItem: async (id, data) => {
    try {
      set({ isLoading: true, error: null });
      const existing = get().items.find((item) => item.id === id);
      if (!existing) {
        throw new Error(`Inspiration item not found: ${id}`);
      }

      const updated = await saveInspirationItem({
        ...existing,
        ...data,
        id,
      });

      set((state) => ({
        items: sortItems(
          state.items.map((item) => (item.id === id ? updated : item))
        ),
        isLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update inspiration item";
      set({ error: message, isLoading: false });
      toast.error("Failed to update item", message);
      throw error;
    }
  },

  removeItem: async (id) => {
    try {
      set({ isLoading: true, error: null });
      await deleteInspirationItem(id);
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        isLoading: false,
      }));
      toast.success("Item removed", "Inspiration item has been removed from your library.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove inspiration item";
      set({ error: message, isLoading: false });
      toast.error("Failed to remove item", message);
      throw error;
    }
  },

  bulkUpsertItems: async (items) => {
    try {
      set({ isLoading: true, error: null });
      const savedItems = await bulkUpsertInspirationItems(items);
      const merged = mergeInspirationItems(get().items, savedItems);
      set({ items: sortItems(merged), isLoading: false });
      return savedItems;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save inspiration items";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  importLegacyCloudItems: async () => {
    try {
      set({ isLoading: true, error: null });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase
        .from("inspiration_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const importedItems = ((data || []) as DbInspirationItem[]).map(mapDbItemToItem);
      const savedItems = await bulkUpsertInspirationItems(importedItems);
      const allLocalItems = await getInspirationItems();
      const packName = `Migrated Inspiration (${new Date().toISOString().slice(0, 10)})`;
      const existingPack = (await getDesignPacks()).find((pack) => pack.name === packName);

      if (savedItems.length > 0) {
        if (existingPack) {
          await updateDesignPack(existingPack.packId, {
            items: mergeInspirationItems(existingPack.items, savedItems),
          });
        } else {
          await createDesignPack({
            name: packName,
            description: "Imported from legacy cloud inspiration",
            items: savedItems,
          });
        }
      }

      set({
        items: sortItems(allLocalItems),
        isLoading: false,
      });

      toast.success(
        "Cloud inspiration imported",
        savedItems.length === 0
          ? "No new inspiration items were added."
          : `${savedItems.length} item${savedItems.length === 1 ? "" : "s"} imported to your local library.`
      );

      return savedItems;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import cloud inspiration";
      set({ error: message, isLoading: false });
      toast.error("Import failed", message);
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

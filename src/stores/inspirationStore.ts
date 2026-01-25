import { create } from "zustand";
import { supabase } from "@/services/supabase";
import { toast } from "@/stores/toastStore";
import { withTimeout, TIMEOUTS } from "@/lib/async-utils";
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

interface InspirationState {
  items: InspirationItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<InspirationItem, "id" | "userId" | "createdAt">) => Promise<InspirationItem>;
  removeItem: (id: string) => Promise<void>;
  updateItem: (id: string, data: Partial<InspirationItem>) => Promise<void>;
  clearError: () => void;

  // Local-only actions for wizard (temporary items before project creation)
  addLocalItem: (item: Omit<InspirationItem, "id">) => InspirationItem;
  removeLocalItem: (id: string) => void;
  clearLocalItems: () => void;

  // Persist local items to database (called during project creation)
  persistLocalItems: () => Promise<Map<string, string>>;
}

function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useInspirationStore = create<InspirationState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ items: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from("inspiration_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items = ((data || []) as DbInspirationItem[]).map(mapDbItemToItem);
      set({ items });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch inspiration items";
      set({ error: message });
      console.error("Failed to fetch inspiration items:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (itemData) => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const insertData = {
        user_id: user.id,
        type: itemData.type,
        title: itemData.title || null,
        source_url: itemData.sourceUrl || null,
        content: itemData.content || null,
        storage_path: itemData.storagePath || null,
      };

      const { data, error } = await supabase
        .from("inspiration_items")
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;

      const item = mapDbItemToItem(data as DbInspirationItem);

      set((state) => ({
        items: [item, ...state.items],
      }));

      return item;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add inspiration item";
      set({ error: message });
      toast.error("Failed to add item", message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (id) => {
    // Check if it's a local item (not yet persisted)
    if (id.startsWith("local_")) {
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));
      return;
    }

    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from("inspiration_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));

      toast.success("Item removed", "Inspiration item has been removed from your library.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove inspiration item";
      set({ error: message });
      toast.error("Failed to remove item", message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateItem: async (id, data) => {
    // Check if it's a local item
    if (id.startsWith("local_")) {
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...data } : item
        ),
      }));
      return;
    }

    try {
      set({ isLoading: true, error: null });

      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.sourceUrl !== undefined) updateData.source_url = data.sourceUrl;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.storagePath !== undefined) updateData.storage_path = data.storagePath;

      const { error } = await supabase
        .from("inspiration_items")
        .update(updateData as never)
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...data } : item
        ),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update inspiration item";
      set({ error: message });
      toast.error("Failed to update item", message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  // Local-only actions for temporary items (e.g., during wizard flow before persisting)
  addLocalItem: (itemData) => {
    const item: InspirationItem = {
      ...itemData,
      id: generateLocalId(),
    };
    set((state) => ({
      items: [...state.items, item],
      error: null,
    }));
    return item;
  },

  removeLocalItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },

  clearLocalItems: () => {
    set((state) => ({
      items: state.items.filter((item) => !item.id.startsWith("local_")),
      error: null,
    }));
  },

  persistLocalItems: async () => {
    const localItems = get().items.filter((item) => item.id.startsWith("local_"));
    const idMapping = new Map<string, string>();

    if (localItems.length === 0) {
      console.log("[inspirationStore] No local items to persist");
      return idMapping;
    }

    console.log(`[inspirationStore] Persisting ${localItems.length} local items in parallel...`);

    // Persist all items in parallel with individual timeouts
    const results = await Promise.all(
      localItems.map(async (item) => {
        try {
          console.log(`[inspirationStore] Persisting item: ${item.id}`);
          const persisted = await withTimeout(
            get().addItem({
              type: item.type,
              title: item.title,
              sourceUrl: item.sourceUrl,
              content: item.content,
              storagePath: item.storagePath,
            }),
            TIMEOUTS.INSPIRATION_PERSIST,
            `persistItem-${item.id}`
          );
          console.log(`[inspirationStore] Persisted ${item.id} -> ${persisted.id}`);
          return { localId: item.id, persistedId: persisted.id, success: true as const };
        } catch (error) {
          console.error(`[inspirationStore] Failed to persist item ${item.id}:`, error);
          return { localId: item.id, persistedId: null, success: false as const };
        }
      })
    );

    // Build the ID mapping from successful persists
    for (const result of results) {
      if (result.success && result.persistedId) {
        idMapping.set(result.localId, result.persistedId);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    console.log(`[inspirationStore] Persist complete: ${successCount} succeeded, ${failCount} failed`);

    // Remove all local items from store (they're now persisted or failed)
    set((state) => ({
      items: state.items.filter((item) => !item.id.startsWith("local_")),
    }));

    return idMapping;
  },
}));

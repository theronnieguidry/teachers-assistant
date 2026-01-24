import { create } from "zustand";
import type { InspirationItem } from "@/types";

interface InspirationState {
  items: InspirationItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addItem: (item: Omit<InspirationItem, "id">) => InspirationItem;
  removeItem: (id: string) => void;
  updateItem: (id: string, data: Partial<InspirationItem>) => void;
  reorderItems: (startIndex: number, endIndex: number) => void;
  clearItems: () => void;
  setItems: (items: InspirationItem[]) => void;
  setError: (error: string | null) => void;
}

function generateId(): string {
  return `insp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useInspirationStore = create<InspirationState>((set) => ({
  items: [],
  isLoading: false,
  error: null,

  addItem: (itemData) => {
    const item: InspirationItem = {
      ...itemData,
      id: generateId(),
    };
    set((state) => ({
      items: [...state.items, item],
      error: null,
    }));
    return item;
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },

  updateItem: (id, data) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...data } : item
      ),
    }));
  },

  reorderItems: (startIndex, endIndex) => {
    set((state) => {
      const newItems = [...state.items];
      const [removed] = newItems.splice(startIndex, 1);
      newItems.splice(endIndex, 0, removed);
      return { items: newItems };
    });
  },

  clearItems: () => {
    set({ items: [], error: null });
  },

  setItems: (items) => {
    set({ items, error: null });
  },

  setError: (error) => {
    set({ error });
  },
}));

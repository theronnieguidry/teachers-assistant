import { describe, it, expect, beforeEach } from "vitest";
import { useInspirationStore } from "@/stores/inspirationStore";

describe("inspirationStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useInspirationStore.setState({
      items: [],
      isLoading: false,
      error: null,
    });
  });

  describe("initial state", () => {
    it("should have empty initial state", () => {
      const state = useInspirationStore.getState();
      expect(state.items).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("addItem", () => {
    it("should add an item with generated id", () => {
      const { addItem } = useInspirationStore.getState();
      addItem({
        type: "url",
        title: "Test URL",
        sourceUrl: "https://example.com",
      });

      const { items } = useInspirationStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe("url");
      expect(items[0].title).toBe("Test URL");
      expect(items[0].sourceUrl).toBe("https://example.com");
      expect(items[0].id).toMatch(/^insp_/);
    });

    it("should clear error when adding item", () => {
      useInspirationStore.setState({ error: "Previous error" });
      const { addItem } = useInspirationStore.getState();

      addItem({ type: "text", title: "Test" });

      expect(useInspirationStore.getState().error).toBeNull();
    });

    it("should append to existing items", () => {
      const { addItem } = useInspirationStore.getState();

      addItem({ type: "url", title: "First" });
      addItem({ type: "pdf", title: "Second" });
      addItem({ type: "image", title: "Third" });

      const { items } = useInspirationStore.getState();
      expect(items).toHaveLength(3);
      expect(items[0].title).toBe("First");
      expect(items[1].title).toBe("Second");
      expect(items[2].title).toBe("Third");
    });
  });

  describe("removeItem", () => {
    it("should remove an item by id", () => {
      const { addItem, removeItem } = useInspirationStore.getState();

      addItem({ type: "url", title: "Keep" });
      addItem({ type: "pdf", title: "Remove" });

      const items = useInspirationStore.getState().items;
      const idToRemove = items[1].id;

      removeItem(idToRemove);

      const updatedItems = useInspirationStore.getState().items;
      expect(updatedItems).toHaveLength(1);
      expect(updatedItems[0].title).toBe("Keep");
    });

    it("should do nothing if id not found", () => {
      const { addItem, removeItem } = useInspirationStore.getState();

      addItem({ type: "url", title: "Test" });
      removeItem("non-existent-id");

      expect(useInspirationStore.getState().items).toHaveLength(1);
    });
  });

  describe("updateItem", () => {
    it("should update an existing item", () => {
      const { addItem, updateItem } = useInspirationStore.getState();

      addItem({ type: "url", title: "Original" });
      const items = useInspirationStore.getState().items;

      updateItem(items[0].id, { title: "Updated", sourceUrl: "https://new.com" });

      const updatedItems = useInspirationStore.getState().items;
      expect(updatedItems[0].title).toBe("Updated");
      expect(updatedItems[0].sourceUrl).toBe("https://new.com");
      expect(updatedItems[0].type).toBe("url"); // unchanged
    });

    it("should not affect other items", () => {
      const { addItem, updateItem } = useInspirationStore.getState();

      addItem({ type: "url", title: "First" });
      addItem({ type: "pdf", title: "Second" });

      const items = useInspirationStore.getState().items;
      updateItem(items[0].id, { title: "Updated First" });

      const updatedItems = useInspirationStore.getState().items;
      expect(updatedItems[0].title).toBe("Updated First");
      expect(updatedItems[1].title).toBe("Second");
    });
  });

  describe("reorderItems", () => {
    it("should reorder items from start to end index", () => {
      const { addItem, reorderItems } = useInspirationStore.getState();

      addItem({ type: "url", title: "A" });
      addItem({ type: "pdf", title: "B" });
      addItem({ type: "image", title: "C" });

      reorderItems(0, 2); // Move A from index 0 to index 2

      const items = useInspirationStore.getState().items;
      expect(items[0].title).toBe("B");
      expect(items[1].title).toBe("C");
      expect(items[2].title).toBe("A");
    });

    it("should handle moving item backward", () => {
      const { addItem, reorderItems } = useInspirationStore.getState();

      addItem({ type: "url", title: "A" });
      addItem({ type: "pdf", title: "B" });
      addItem({ type: "image", title: "C" });

      reorderItems(2, 0); // Move C from index 2 to index 0

      const items = useInspirationStore.getState().items;
      expect(items[0].title).toBe("C");
      expect(items[1].title).toBe("A");
      expect(items[2].title).toBe("B");
    });
  });

  describe("clearItems", () => {
    it("should clear all items and error", () => {
      const { addItem, clearItems } = useInspirationStore.getState();

      addItem({ type: "url", title: "Test" });
      useInspirationStore.setState({ error: "Some error" });

      clearItems();

      const state = useInspirationStore.getState();
      expect(state.items).toEqual([]);
      expect(state.error).toBeNull();
    });
  });

  describe("setError", () => {
    it("should set error message", () => {
      const { setError } = useInspirationStore.getState();

      setError("Something went wrong");

      expect(useInspirationStore.getState().error).toBe("Something went wrong");
    });

    it("should clear error when set to null", () => {
      useInspirationStore.setState({ error: "Previous error" });
      const { setError } = useInspirationStore.getState();

      setError(null);

      expect(useInspirationStore.getState().error).toBeNull();
    });
  });
});

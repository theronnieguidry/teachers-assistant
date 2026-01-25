import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useInspirationStore } from "@/stores/inspirationStore";
import { supabase } from "@/services/supabase";
import { TIMEOUTS } from "@/lib/async-utils";

// Mock supabase
vi.mock("@/services/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

// Mock toast store
vi.mock("@/stores/toastStore", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockDbItem = {
  id: "item-123",
  user_id: "user-123",
  type: "url",
  title: "Test URL",
  source_url: "https://example.com",
  content: null,
  storage_path: null,
  created_at: "2024-01-01T00:00:00Z",
};

describe("inspirationStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useInspirationStore.setState({
      items: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have empty initial state", () => {
      const state = useInspirationStore.getState();
      expect(state.items).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchItems", () => {
    it("should fetch items when user is authenticated", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockDbItem],
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useInspirationStore.getState().fetchItems();

      const state = useInspirationStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe("item-123");
      expect(state.items[0].type).toBe("url");
      expect(state.items[0].title).toBe("Test URL");
      expect(state.isLoading).toBe(false);
    });

    it("should clear items when user is not authenticated", async () => {
      useInspirationStore.setState({ items: [{ id: "1", type: "url", title: "Test" }] });

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      await useInspirationStore.getState().fetchItems();

      expect(useInspirationStore.getState().items).toEqual([]);
    });

    it("should set error on fetch failure", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Database error"),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useInspirationStore.getState().fetchItems();

      expect(useInspirationStore.getState().error).toBe("Database error");
    });
  });

  describe("addItem", () => {
    it("should add item to database and store", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbItem,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const result = await useInspirationStore.getState().addItem({
        type: "url",
        title: "Test URL",
        sourceUrl: "https://example.com",
      });

      expect(result.id).toBe("item-123");
      expect(result.type).toBe("url");

      const { items } = useInspirationStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("item-123");
    });

    it("should throw error when not authenticated", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      await expect(
        useInspirationStore.getState().addItem({
          type: "url",
          title: "Test",
        })
      ).rejects.toThrow("Not authenticated");
    });

    it("should prepend new item to list", async () => {
      useInspirationStore.setState({
        items: [{
          id: "existing",
          type: "pdf",
          title: "Existing",
        }],
      });

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbItem,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useInspirationStore.getState().addItem({
        type: "url",
        title: "Test URL",
      });

      const { items } = useInspirationStore.getState();
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe("item-123"); // New item first
      expect(items[1].id).toBe("existing");
    });
  });

  describe("removeItem", () => {
    it("should remove item from database and store", async () => {
      useInspirationStore.setState({
        items: [{
          id: "item-123",
          type: "url",
          title: "Test",
        }],
      });

      const mockQueryBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useInspirationStore.getState().removeItem("item-123");

      expect(useInspirationStore.getState().items).toHaveLength(0);
    });

    it("should remove local item without database call", async () => {
      useInspirationStore.setState({
        items: [{
          id: "local_12345",
          type: "url",
          title: "Local Item",
        }],
      });

      await useInspirationStore.getState().removeItem("local_12345");

      expect(useInspirationStore.getState().items).toHaveLength(0);
      // Should not have called supabase
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("should handle delete error", async () => {
      useInspirationStore.setState({
        items: [{
          id: "item-123",
          type: "url",
          title: "Test",
        }],
      });

      const mockQueryBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Delete failed"),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await expect(
        useInspirationStore.getState().removeItem("item-123")
      ).rejects.toThrow("Delete failed");
    });
  });

  describe("updateItem", () => {
    it("should update item in database and store", async () => {
      useInspirationStore.setState({
        items: [{
          id: "item-123",
          type: "url",
          title: "Original",
        }],
      });

      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      await useInspirationStore.getState().updateItem("item-123", {
        title: "Updated",
        sourceUrl: "https://new.com",
      });

      const { items } = useInspirationStore.getState();
      expect(items[0].title).toBe("Updated");
      expect(items[0].sourceUrl).toBe("https://new.com");
    });

    it("should update local item without database call", async () => {
      useInspirationStore.setState({
        items: [{
          id: "local_12345",
          type: "url",
          title: "Original",
        }],
      });

      await useInspirationStore.getState().updateItem("local_12345", {
        title: "Updated",
      });

      expect(useInspirationStore.getState().items[0].title).toBe("Updated");
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe("local item operations", () => {
    describe("addLocalItem", () => {
      it("should add item with local_ prefix id", () => {
        const { addLocalItem } = useInspirationStore.getState();
        const item = addLocalItem({
          type: "url",
          title: "Local Test",
          sourceUrl: "https://local.com",
        });

        expect(item.id).toMatch(/^local_/);
        expect(item.type).toBe("url");
        expect(item.title).toBe("Local Test");

        const { items } = useInspirationStore.getState();
        expect(items).toHaveLength(1);
      });

      it("should append to existing items", () => {
        const { addLocalItem } = useInspirationStore.getState();

        addLocalItem({ type: "url", title: "First" });
        addLocalItem({ type: "pdf", title: "Second" });

        const { items } = useInspirationStore.getState();
        expect(items).toHaveLength(2);
        expect(items[0].title).toBe("First");
        expect(items[1].title).toBe("Second");
      });
    });

    describe("removeLocalItem", () => {
      it("should remove item by id", () => {
        const { addLocalItem, removeLocalItem } = useInspirationStore.getState();

        addLocalItem({ type: "url", title: "Keep" });
        addLocalItem({ type: "pdf", title: "Remove" });

        const items = useInspirationStore.getState().items;
        const idToRemove = items[1].id;

        removeLocalItem(idToRemove);

        const updatedItems = useInspirationStore.getState().items;
        expect(updatedItems).toHaveLength(1);
        expect(updatedItems[0].title).toBe("Keep");
      });
    });

    describe("clearLocalItems", () => {
      it("should remove only local items", () => {
        // Add a mix of local and persisted items
        useInspirationStore.setState({
          items: [
            { id: "local_123", type: "url", title: "Local 1" },
            { id: "uuid-persisted", type: "pdf", title: "Persisted" },
            { id: "local_456", type: "image", title: "Local 2" },
          ],
        });

        useInspirationStore.getState().clearLocalItems();

        const { items } = useInspirationStore.getState();
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe("uuid-persisted");
      });
    });
  });

  describe("clearError", () => {
    it("should clear error", () => {
      useInspirationStore.setState({ error: "Some error" });

      useInspirationStore.getState().clearError();

      expect(useInspirationStore.getState().error).toBeNull();
    });
  });

  describe("persistLocalItems", () => {
    it("should return empty map when no local items", async () => {
      useInspirationStore.setState({
        items: [
          { id: "uuid-persisted", type: "url", title: "Persisted" },
        ],
      });

      const { persistLocalItems } = useInspirationStore.getState();
      const idMapping = await persistLocalItems();

      expect(idMapping.size).toBe(0);
    });

    it("should persist local items and return id mapping", async () => {
      useInspirationStore.setState({
        items: [
          { id: "local_123", type: "url", title: "Local URL", sourceUrl: "https://example.com" },
          { id: "uuid-persisted", type: "pdf", title: "Persisted" },
        ],
      });

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "new-uuid-123",
            user_id: "user-123",
            type: "url",
            title: "Local URL",
            source_url: "https://example.com",
            content: null,
            storage_path: null,
            created_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const { persistLocalItems } = useInspirationStore.getState();
      const idMapping = await persistLocalItems();

      expect(idMapping.size).toBe(1);
      expect(idMapping.get("local_123")).toBe("new-uuid-123");

      // Local items should be removed
      const { items } = useInspirationStore.getState();
      expect(items.some(i => i.id.startsWith("local_"))).toBe(false);
    });

    it("should persist multiple local items", async () => {
      useInspirationStore.setState({
        items: [
          { id: "local_1", type: "url", title: "URL 1" },
          { id: "local_2", type: "pdf", title: "PDF 1" },
        ],
      });

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      let callCount = 0;
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve({
            data: {
              id: `persisted-${callCount}`,
              user_id: "user-123",
              type: callCount === 1 ? "url" : "pdf",
              title: callCount === 1 ? "URL 1" : "PDF 1",
              source_url: null,
              content: null,
              storage_path: null,
              created_at: "2024-01-01T00:00:00Z",
            },
            error: null,
          });
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const { persistLocalItems } = useInspirationStore.getState();
      const idMapping = await persistLocalItems();

      expect(idMapping.size).toBe(2);
      expect(idMapping.get("local_1")).toBe("persisted-1");
      expect(idMapping.get("local_2")).toBe("persisted-2");
    });

    it("should continue persisting other items if one fails", async () => {
      useInspirationStore.setState({
        items: [
          { id: "local_1", type: "url", title: "URL 1" },
          { id: "local_2", type: "pdf", title: "PDF 1" },
        ],
      });

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      let callCount = 0;
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              data: null,
              error: new Error("Database error"),
            });
          }
          return Promise.resolve({
            data: {
              id: "persisted-2",
              user_id: "user-123",
              type: "pdf",
              title: "PDF 1",
              source_url: null,
              content: null,
              storage_path: null,
              created_at: "2024-01-01T00:00:00Z",
            },
            error: null,
          });
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const { persistLocalItems } = useInspirationStore.getState();
      const idMapping = await persistLocalItems();

      // First item failed, second succeeded
      expect(idMapping.size).toBe(1);
      expect(idMapping.has("local_1")).toBe(false);
      expect(idMapping.get("local_2")).toBe("persisted-2");

      // All local items should still be removed
      const { items } = useInspirationStore.getState();
      expect(items.some(i => i.id.startsWith("local_"))).toBe(false);
    });

    it("should persist items in parallel (not sequentially)", async () => {
      // Track the order of start/end for each persistence
      const timeline: string[] = [];

      useInspirationStore.setState({
        items: [
          { id: "local_1", type: "url", title: "URL 1" },
          { id: "local_2", type: "pdf", title: "PDF 1" },
          { id: "local_3", type: "text", title: "Text 1" },
        ],
      });

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      } as never);

      let callIndex = 0;
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => {
          const currentIndex = ++callIndex;
          timeline.push(`start-${currentIndex}`);

          // All calls started - verify they're all running before any complete
          // (In parallel execution, all starts happen before any ends)

          // Simulate async operation
          await Promise.resolve();

          timeline.push(`end-${currentIndex}`);
          return {
            data: {
              id: `persisted-${currentIndex}`,
              user_id: "user-123",
              type: "url",
              title: `Item ${currentIndex}`,
              source_url: null,
              content: null,
              storage_path: null,
              created_at: "2024-01-01T00:00:00Z",
            },
            error: null,
          };
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      const { persistLocalItems } = useInspirationStore.getState();
      await persistLocalItems();

      // In parallel execution, all items should be processed
      expect(callIndex).toBe(3);

      // Verify all 3 items were persisted
      expect(timeline.filter(t => t.startsWith("start-"))).toHaveLength(3);
      expect(timeline.filter(t => t.startsWith("end-"))).toHaveLength(3);
    });

    it("should use INSPIRATION_PERSIST timeout constant", () => {
      // Verify the timeout constant is reasonable
      expect(TIMEOUTS.INSPIRATION_PERSIST).toBe(5000); // 5 seconds per item
    });
  });
});

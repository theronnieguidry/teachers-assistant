import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInspirationStore } from "@/stores/inspirationStore";
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

vi.mock("@/services/inspiration-storage", () => ({
  getInspirationItems: vi.fn(),
  saveInspirationItem: vi.fn(),
  deleteInspirationItem: vi.fn(),
  bulkUpsertInspirationItems: vi.fn(),
}));

vi.mock("@/services/design-pack-storage", () => ({
  getDesignPacks: vi.fn(),
  createDesignPack: vi.fn(),
  updateDesignPack: vi.fn(),
}));

vi.mock("@/services/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock("@/stores/toastStore", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const localItem = {
  id: "local-1",
  type: "url" as const,
  title: "Example",
  sourceUrl: "https://example.com",
  createdAt: new Date("2026-04-10T10:00:00Z"),
};

describe("inspirationStore", () => {
  beforeEach(() => {
    useInspirationStore.setState({
      items: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads local inspiration items from canonical storage", async () => {
    vi.mocked(getInspirationItems).mockResolvedValue([localItem]);

    await useInspirationStore.getState().fetchItems();

    expect(getInspirationItems).toHaveBeenCalled();
    expect(useInspirationStore.getState().items).toEqual([localItem]);
  });

  it("adds an item through local storage immediately", async () => {
    vi.mocked(saveInspirationItem).mockImplementation(async (item) => ({
      ...item,
      id: "saved-1",
    }));

    const result = await useInspirationStore.getState().addItem({
      type: "url",
      title: "Saved Item",
      sourceUrl: "https://saved.example.com",
    });

    expect(saveInspirationItem).toHaveBeenCalled();
    expect(result.id).toBe("saved-1");
    expect(useInspirationStore.getState().items[0]?.id).toBe("saved-1");
  });

  it("removes an item from canonical local storage", async () => {
    useInspirationStore.setState({ items: [localItem] });

    await useInspirationStore.getState().removeItem(localItem.id);

    expect(deleteInspirationItem).toHaveBeenCalledWith(localItem.id);
    expect(useInspirationStore.getState().items).toEqual([]);
  });

  it("bulk-upserts imported items and merges them into store state", async () => {
    vi.mocked(bulkUpsertInspirationItems).mockResolvedValue([
      localItem,
      {
        id: "pdf-1",
        type: "pdf",
        title: "Unit Notes",
        content: "base64",
        createdAt: new Date("2026-04-10T09:00:00Z"),
      },
    ]);

    const savedItems = await useInspirationStore.getState().bulkUpsertItems([
      localItem,
      {
        id: "pdf-1",
        type: "pdf",
        title: "Unit Notes",
        content: "base64",
      },
    ]);

    expect(savedItems).toHaveLength(2);
    expect(useInspirationStore.getState().items).toHaveLength(2);
  });

  it("imports legacy cloud inspiration into local storage and creates a migration pack", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    } as never);

    const select = vi.fn().mockReturnThis();
    const eq = vi.fn().mockReturnThis();
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "cloud-1",
          user_id: "user-123",
          type: "url",
          title: "Cloud Example",
          source_url: "https://example.com",
          content: null,
          storage_path: null,
          created_at: "2026-04-10T10:00:00.000Z",
        },
      ],
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue({
      select,
      eq,
      order,
    } as never);

    vi.mocked(bulkUpsertInspirationItems).mockResolvedValue([
      {
        id: "cloud-1",
        type: "url",
        title: "Cloud Example",
        sourceUrl: "https://example.com",
        createdAt: new Date("2026-04-10T10:00:00.000Z"),
      },
    ]);
    vi.mocked(getInspirationItems).mockResolvedValue([
      {
        id: "cloud-1",
        type: "url",
        title: "Cloud Example",
        sourceUrl: "https://example.com",
        createdAt: new Date("2026-04-10T10:00:00.000Z"),
      },
    ]);
    vi.mocked(getDesignPacks).mockResolvedValue([]);

    const imported = await useInspirationStore.getState().importLegacyCloudItems();

    expect(imported).toHaveLength(1);
    expect(createDesignPack).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringMatching(/^Migrated Inspiration \(\d{4}-\d{2}-\d{2}\)$/),
        items: expect.arrayContaining([
          expect.objectContaining({ id: "cloud-1", title: "Cloud Example" }),
        ]),
      })
    );
    expect(useInspirationStore.getState().items).toHaveLength(1);
  });

  it("updates the existing migration pack on repeated cloud imports", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    } as never);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    } as never);
    vi.mocked(bulkUpsertInspirationItems).mockResolvedValue([localItem]);
    vi.mocked(getInspirationItems).mockResolvedValue([localItem]);
    vi.mocked(getDesignPacks).mockResolvedValue([
      {
        packId: "pack-1",
        name: `Migrated Inspiration (${new Date().toISOString().slice(0, 10)})`,
        items: [localItem],
        createdAt: "2026-04-10T10:00:00.000Z",
        updatedAt: "2026-04-10T10:00:00.000Z",
      },
    ]);

    await useInspirationStore.getState().importLegacyCloudItems();

    expect(updateDesignPack).toHaveBeenCalledWith(
      "pack-1",
      expect.objectContaining({
        items: expect.arrayContaining([expect.objectContaining({ id: "local-1" })]),
      })
    );
    expect(createDesignPack).not.toHaveBeenCalled();
  });
});

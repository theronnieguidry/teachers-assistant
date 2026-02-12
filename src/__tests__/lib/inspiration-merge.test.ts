import { describe, expect, it } from "vitest";
import { mapDesignPackItemsToInspiration, mergeInspirationItems } from "@/lib/inspiration-merge";

describe("inspiration merge utilities", () => {
  it("maps design pack items into inspiration-compatible items", () => {
    const mapped = mapDesignPackItemsToInspiration("pack-1", [
      {
        itemId: "item-1",
        type: "url",
        title: "Example",
        sourceUrl: "https://example.com",
      },
    ]);

    expect(mapped).toEqual([
      expect.objectContaining({
        id: "pack:pack-1:item-1",
        type: "url",
        title: "Example",
        sourceUrl: "https://example.com",
      }),
    ]);
  });

  it("merges ad-hoc and design-pack inspiration deterministically with de-duplication", () => {
    const adHoc = [
      {
        id: "adhoc-1",
        type: "url" as const,
        title: "Example",
        sourceUrl: "https://example.com",
      },
    ];
    const packItems = [
      {
        id: "pack-dup",
        type: "url" as const,
        title: "Example",
        sourceUrl: "https://example.com",
      },
      {
        id: "pack-2",
        type: "pdf" as const,
        title: "Unit Notes",
        content: "base64-pdf",
      },
    ];

    const merged = mergeInspirationItems(adHoc, packItems);
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe("adhoc-1");
    expect(merged[1].id).toBe("pack-2");
  });
});

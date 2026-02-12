import type { DesignPackItem, InspirationItem } from "@/types";

function createInspirationMergeKey(item: InspirationItem): string {
  return [
    item.type,
    item.sourceUrl || "",
    item.title || "",
    item.content || "",
    item.storagePath || "",
  ].join("|");
}

export function mapDesignPackItemsToInspiration(
  packId: string,
  items: DesignPackItem[]
): InspirationItem[] {
  return items.map((item) => ({
    id: `pack:${packId}:${item.itemId}`,
    type: item.type,
    title: item.title,
    sourceUrl: item.sourceUrl,
    content: item.content,
    storagePath: item.storagePath,
  }));
}

export function mergeInspirationItems(
  adHocItems: InspirationItem[],
  designPackItems: InspirationItem[]
): InspirationItem[] {
  const merged = new Map<string, InspirationItem>();
  for (const item of [...adHocItems, ...designPackItems]) {
    const key = createInspirationMergeKey(item);
    if (!merged.has(key)) {
      merged.set(key, item);
    }
  }
  return Array.from(merged.values());
}

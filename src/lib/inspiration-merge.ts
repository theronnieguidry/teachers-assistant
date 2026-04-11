import type { InspirationItem } from "@/types";

export function createInspirationMergeKey(item: Pick<
  InspirationItem,
  "type" | "sourceUrl" | "title" | "content" | "storagePath"
>): string {
  return [
    item.type,
    item.sourceUrl || "",
    item.title || "",
    item.content || "",
    item.storagePath || "",
  ].join("|");
}

export function mergeInspirationItems(...groups: InspirationItem[][]): InspirationItem[] {
  const merged = new Map<string, InspirationItem>();

  for (const group of groups) {
    for (const item of group) {
      const key = createInspirationMergeKey(item);
      if (!merged.has(key)) {
        merged.set(key, item);
      }
    }
  }

  return Array.from(merged.values());
}

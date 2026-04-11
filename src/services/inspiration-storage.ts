import { invoke } from "@tauri-apps/api/core";
import { isTauriContext } from "./tauri-bridge";
import { createInspirationMergeKey } from "@/lib/inspiration-merge";
import type { InspirationItem } from "@/types";

const INSPIRATION_ITEMS_KEY = "inspiration-items";

function deserializeInspirationItem(item: InspirationItem): InspirationItem {
  return {
    ...item,
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
  };
}

function serializeInspirationItem(item: InspirationItem): InspirationItem {
  return {
    ...item,
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
  };
}

function getBrowserItems(): InspirationItem[] {
  const stored = localStorage.getItem(INSPIRATION_ITEMS_KEY);
  if (!stored) {
    return [];
  }

  try {
    const items = JSON.parse(stored) as InspirationItem[];
    return items.map(deserializeInspirationItem);
  } catch {
    return [];
  }
}

function saveBrowserItems(items: InspirationItem[]): void {
  localStorage.setItem(INSPIRATION_ITEMS_KEY, JSON.stringify(items));
}

function normalizeInspirationItem(item: InspirationItem): InspirationItem {
  return {
    ...item,
    id: item.id || crypto.randomUUID(),
    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
  };
}

export async function getInspirationItems(): Promise<InspirationItem[]> {
  if (!isTauriContext()) {
    return getBrowserItems();
  }

  const result = await invoke<string>("get_inspiration_items");
  const items = JSON.parse(result) as InspirationItem[];
  return items.map(deserializeInspirationItem);
}

export async function getInspirationItem(itemId: string): Promise<InspirationItem | null> {
  if (!isTauriContext()) {
    return getBrowserItems().find((item) => item.id === itemId) || null;
  }

  try {
    const result = await invoke<string>("get_inspiration_item", { itemId });
    return deserializeInspirationItem(JSON.parse(result) as InspirationItem);
  } catch {
    return null;
  }
}

export async function saveInspirationItem(item: InspirationItem): Promise<InspirationItem> {
  const normalized = normalizeInspirationItem(item);

  if (!isTauriContext()) {
    const items = getBrowserItems();
    const index = items.findIndex((existing) => existing.id === normalized.id);
    if (index >= 0) {
      items[index] = normalized;
    } else {
      items.unshift(normalized);
    }
    saveBrowserItems(items);
    return normalized;
  }

  await invoke("save_inspiration_item", {
    item: JSON.stringify(serializeInspirationItem(normalized)),
  });
  return normalized;
}

export async function deleteInspirationItem(itemId: string): Promise<void> {
  if (!isTauriContext()) {
    const filtered = getBrowserItems().filter((item) => item.id !== itemId);
    saveBrowserItems(filtered);
    return;
  }

  await invoke("delete_inspiration_item", { itemId });
}

export async function bulkUpsertInspirationItems(
  items: InspirationItem[]
): Promise<InspirationItem[]> {
  if (items.length === 0) {
    return [];
  }

  if (!isTauriContext()) {
    const existing = getBrowserItems();
    const byKey = new Map(existing.map((item) => [createInspirationMergeKey(item), item]));
    const byId = new Map(existing.map((item) => [item.id, item]));
    const resolved: InspirationItem[] = [];

    for (const item of items) {
      const normalized = normalizeInspirationItem(item);
      const key = createInspirationMergeKey(normalized);
      const matched = byId.get(normalized.id) || byKey.get(key);
      if (matched) {
        resolved.push(matched);
        continue;
      }

      existing.unshift(normalized);
      byId.set(normalized.id, normalized);
      byKey.set(key, normalized);
      resolved.push(normalized);
    }

    saveBrowserItems(existing);
    return resolved;
  }

  const result = await invoke<string>("bulk_upsert_inspiration_items", {
    items: JSON.stringify(items.map((item) => serializeInspirationItem(normalizeInspirationItem(item)))),
  });
  const resolved = JSON.parse(result) as InspirationItem[];
  return resolved.map(deserializeInspirationItem);
}

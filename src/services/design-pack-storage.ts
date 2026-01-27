import { invoke } from "@tauri-apps/api/core";
import { isTauriContext } from "./tauri-bridge";
import type {
  DesignPack,
  DesignPackItem,
  CreateDesignPackData,
} from "@/types";

// ============================================
// Design Pack Functions
// ============================================

/**
 * Get all design packs
 */
export async function getDesignPacks(): Promise<DesignPack[]> {
  if (!isTauriContext()) {
    // Browser fallback - use localStorage
    const stored = localStorage.getItem("design-packs");
    return stored ? JSON.parse(stored) : [];
  }

  const result = await invoke<string>("get_design_packs");
  return JSON.parse(result);
}

/**
 * Get a specific design pack by ID
 */
export async function getDesignPack(packId: string): Promise<DesignPack | null> {
  if (!isTauriContext()) {
    // Browser fallback
    const packs = await getDesignPacks();
    return packs.find((p) => p.packId === packId) || null;
  }

  try {
    const result = await invoke<string>("get_design_pack", { packId });
    return JSON.parse(result);
  } catch {
    return null;
  }
}

/**
 * Save a design pack (create or update)
 */
export async function saveDesignPack(pack: DesignPack): Promise<void> {
  if (!isTauriContext()) {
    // Browser fallback
    const packs = await getDesignPacks();
    const index = packs.findIndex((p) => p.packId === pack.packId);
    if (index >= 0) {
      packs[index] = pack;
    } else {
      packs.push(pack);
    }
    localStorage.setItem("design-packs", JSON.stringify(packs));
    return;
  }

  await invoke("save_design_pack", {
    pack: JSON.stringify(pack),
  });
}

/**
 * Create a new design pack
 */
export async function createDesignPack(data: CreateDesignPackData): Promise<DesignPack> {
  const now = new Date().toISOString();
  const pack: DesignPack = {
    packId: crypto.randomUUID(),
    name: data.name,
    description: data.description,
    items: data.items || [],
    createdAt: now,
    updatedAt: now,
  };

  await saveDesignPack(pack);
  return pack;
}

/**
 * Update a design pack
 */
export async function updateDesignPack(
  packId: string,
  updates: Partial<Omit<DesignPack, "packId" | "createdAt">>
): Promise<DesignPack> {
  const pack = await getDesignPack(packId);
  if (!pack) {
    throw new Error(`Design pack not found: ${packId}`);
  }

  const updated: DesignPack = {
    ...pack,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveDesignPack(updated);
  return updated;
}

/**
 * Delete a design pack
 */
export async function deleteDesignPack(packId: string): Promise<void> {
  if (!isTauriContext()) {
    // Browser fallback
    const packs = await getDesignPacks();
    const filtered = packs.filter((p) => p.packId !== packId);
    localStorage.setItem("design-packs", JSON.stringify(filtered));
    return;
  }

  await invoke("delete_design_pack", { packId });
}

/**
 * Add an item to a design pack
 */
export async function addItemToDesignPack(
  packId: string,
  item: Omit<DesignPackItem, "itemId">
): Promise<DesignPackItem> {
  const pack = await getDesignPack(packId);
  if (!pack) {
    throw new Error(`Design pack not found: ${packId}`);
  }

  const newItem: DesignPackItem = {
    ...item,
    itemId: crypto.randomUUID(),
  };

  pack.items.push(newItem);
  pack.updatedAt = new Date().toISOString();

  await saveDesignPack(pack);
  return newItem;
}

/**
 * Remove an item from a design pack
 */
export async function removeItemFromDesignPack(
  packId: string,
  itemId: string
): Promise<void> {
  const pack = await getDesignPack(packId);
  if (!pack) {
    throw new Error(`Design pack not found: ${packId}`);
  }

  pack.items = pack.items.filter((i) => i.itemId !== itemId);
  pack.updatedAt = new Date().toISOString();

  await saveDesignPack(pack);
}

/**
 * Reorder items in a design pack
 */
export async function reorderDesignPackItems(
  packId: string,
  itemIds: string[]
): Promise<void> {
  const pack = await getDesignPack(packId);
  if (!pack) {
    throw new Error(`Design pack not found: ${packId}`);
  }

  // Create a map of items by ID
  const itemMap = new Map(pack.items.map((i) => [i.itemId, i]));

  // Reorder based on itemIds array
  const reorderedItems: DesignPackItem[] = [];
  for (const id of itemIds) {
    const item = itemMap.get(id);
    if (item) {
      reorderedItems.push(item);
      itemMap.delete(id);
    }
  }

  // Add any remaining items not in the itemIds array
  for (const item of itemMap.values()) {
    reorderedItems.push(item);
  }

  pack.items = reorderedItems;
  pack.updatedAt = new Date().toISOString();

  await saveDesignPack(pack);
}

/**
 * Convert legacy inspiration items to a design pack
 */
export async function createDesignPackFromLegacyItems(
  name: string,
  legacyItems: Array<{
    id: string;
    type: "url" | "pdf" | "image" | "text";
    title: string;
    sourceUrl?: string;
    content?: string;
    storagePath?: string;
  }>
): Promise<DesignPack> {
  const now = new Date().toISOString();
  const pack: DesignPack = {
    packId: crypto.randomUUID(),
    name,
    items: legacyItems.map((item) => ({
      itemId: item.id.startsWith("local_") ? crypto.randomUUID() : item.id,
      type: item.type,
      title: item.title,
      sourceUrl: item.sourceUrl,
      content: item.content,
      storagePath: item.storagePath,
    })),
    createdAt: now,
    updatedAt: now,
  };

  await saveDesignPack(pack);
  return pack;
}

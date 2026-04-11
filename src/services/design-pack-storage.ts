import { invoke } from "@tauri-apps/api/core";
import { isTauriContext } from "./tauri-bridge";
import {
  bulkUpsertInspirationItems,
  getInspirationItems,
} from "@/services/inspiration-storage";
import type {
  CreateDesignPackData,
  DesignPack,
  InspirationItem,
  StoredDesignPack,
} from "@/types";

const DESIGN_PACKS_KEY = "design-packs";

interface LegacyDesignPackItem {
  id?: string;
  itemId?: string;
  type: InspirationItem["type"];
  title: string;
  sourceUrl?: string;
  content?: string;
  storagePath?: string;
}

type RawDesignPack = StoredDesignPack & { items?: LegacyDesignPackItem[] };

function normalizeLegacyItem(item: LegacyDesignPackItem): InspirationItem {
  return {
    id: item.id || item.itemId || crypto.randomUUID(),
    type: item.type,
    title: item.title,
    sourceUrl: item.sourceUrl,
    content: item.content,
    storagePath: item.storagePath,
    createdAt: new Date(),
  };
}

function isStoredDesignPack(pack: RawDesignPack): pack is StoredDesignPack {
  return Array.isArray(pack.itemIds);
}

function getBrowserStoredPacks(): RawDesignPack[] {
  const stored = localStorage.getItem(DESIGN_PACKS_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as RawDesignPack[];
  } catch {
    return [];
  }
}

function saveBrowserStoredPacks(packs: StoredDesignPack[]): void {
  localStorage.setItem(DESIGN_PACKS_KEY, JSON.stringify(packs));
}

async function readStoredPacks(): Promise<RawDesignPack[]> {
  if (!isTauriContext()) {
    return getBrowserStoredPacks();
  }

  const result = await invoke<string>("get_design_packs");
  return JSON.parse(result) as RawDesignPack[];
}

async function writeStoredPacks(packs: StoredDesignPack[]): Promise<void> {
  if (!isTauriContext()) {
    saveBrowserStoredPacks(packs);
    return;
  }

  for (const pack of packs) {
    await invoke("save_design_pack", {
      pack: JSON.stringify(pack),
    });
  }

  const existing = await readStoredPacks();
  const existingIds = new Set(packs.map((pack) => pack.packId));
  for (const pack of existing) {
    if (!existingIds.has(pack.packId)) {
      await invoke("delete_design_pack", { packId: pack.packId });
    }
  }
}

function resolveDesignPack(
  pack: StoredDesignPack,
  itemsById: Map<string, InspirationItem>
): DesignPack {
  const items: InspirationItem[] = [];
  const missingItemIds: string[] = [];

  for (const itemId of pack.itemIds) {
    const item = itemsById.get(itemId);
    if (item) {
      items.push(item);
    } else {
      missingItemIds.push(itemId);
    }
  }

  return {
    packId: pack.packId,
    name: pack.name,
    description: pack.description,
    items,
    missingItemIds: missingItemIds.length > 0 ? missingItemIds : undefined,
    parsedSummary: pack.parsedSummary,
    createdAt: pack.createdAt,
    updatedAt: pack.updatedAt,
  };
}

async function migrateStoredPacks(packs: RawDesignPack[]): Promise<StoredDesignPack[]> {
  const migrated: StoredDesignPack[] = [];
  let didMigrate = false;

  for (const pack of packs) {
    if (isStoredDesignPack(pack)) {
      migrated.push(pack);
      continue;
    }

    const embeddedItems = Array.isArray(pack.items)
      ? pack.items.map(normalizeLegacyItem)
      : [];
    const savedItems = await bulkUpsertInspirationItems(embeddedItems);

    migrated.push({
      packId: pack.packId,
      name: pack.name,
      description: pack.description,
      itemIds: savedItems.map((item) => item.id),
      parsedSummary: pack.parsedSummary,
      createdAt: pack.createdAt,
      updatedAt: pack.updatedAt,
    });
    didMigrate = true;
  }

  if (didMigrate) {
    await writeStoredPacks(migrated);
  }

  return migrated;
}

async function getResolvedPacks(): Promise<{
  storedPacks: StoredDesignPack[];
  resolvedPacks: DesignPack[];
}> {
  const rawPacks = await readStoredPacks();
  const storedPacks = await migrateStoredPacks(rawPacks);
  const items = await getInspirationItems();
  const itemsById = new Map(items.map((item) => [item.id, item]));

  return {
    storedPacks,
    resolvedPacks: storedPacks.map((pack) => resolveDesignPack(pack, itemsById)),
  };
}

async function saveStoredPack(pack: StoredDesignPack): Promise<void> {
  if (!isTauriContext()) {
    const packs = await migrateStoredPacks(getBrowserStoredPacks());
    const index = packs.findIndex((existing) => existing.packId === pack.packId);
    if (index >= 0) {
      packs[index] = pack;
    } else {
      packs.push(pack);
    }
    saveBrowserStoredPacks(packs);
    return;
  }

  await invoke("save_design_pack", {
    pack: JSON.stringify(pack),
  });
}

async function resolveItemsToIds(items?: InspirationItem[]): Promise<string[]> {
  if (!items || items.length === 0) {
    return [];
  }

  const savedItems = await bulkUpsertInspirationItems(items);
  return savedItems.map((item) => item.id);
}

export async function getDesignPacks(): Promise<DesignPack[]> {
  const { resolvedPacks } = await getResolvedPacks();
  return resolvedPacks;
}

export async function getDesignPack(packId: string): Promise<DesignPack | null> {
  const { resolvedPacks } = await getResolvedPacks();
  return resolvedPacks.find((pack) => pack.packId === packId) || null;
}

export async function saveDesignPack(pack: DesignPack): Promise<void> {
  const itemIds = await resolveItemsToIds(pack.items);
  await saveStoredPack({
    packId: pack.packId,
    name: pack.name,
    description: pack.description,
    itemIds,
    parsedSummary: pack.parsedSummary,
    createdAt: pack.createdAt,
    updatedAt: pack.updatedAt,
  });
}

export async function createDesignPack(data: CreateDesignPackData): Promise<DesignPack> {
  const now = new Date().toISOString();
  const itemIds = await resolveItemsToIds(data.items);

  const pack: StoredDesignPack = {
    packId: crypto.randomUUID(),
    name: data.name,
    description: data.description,
    itemIds,
    createdAt: now,
    updatedAt: now,
  };

  await saveStoredPack(pack);
  return (await getDesignPack(pack.packId)) as DesignPack;
}

export async function updateDesignPack(
  packId: string,
  updates: Partial<Omit<DesignPack, "packId" | "createdAt">>
): Promise<DesignPack> {
  const { storedPacks } = await getResolvedPacks();
  const pack = storedPacks.find((existing) => existing.packId === packId);
  if (!pack) {
    throw new Error(`Design pack not found: ${packId}`);
  }

  const updated: StoredDesignPack = {
    ...pack,
    name: updates.name ?? pack.name,
    description: updates.description ?? pack.description,
    itemIds: updates.items ? await resolveItemsToIds(updates.items) : pack.itemIds,
    parsedSummary: updates.parsedSummary ?? pack.parsedSummary,
    updatedAt: new Date().toISOString(),
  };

  await saveStoredPack(updated);
  return (await getDesignPack(packId)) as DesignPack;
}

export async function deleteDesignPack(packId: string): Promise<void> {
  if (!isTauriContext()) {
    const packs = await migrateStoredPacks(getBrowserStoredPacks());
    saveBrowserStoredPacks(packs.filter((pack) => pack.packId !== packId));
    return;
  }

  await invoke("delete_design_pack", { packId });
}

export async function addItemToDesignPack(
  packId: string,
  item: Omit<InspirationItem, "id">
): Promise<InspirationItem> {
  const { storedPacks } = await getResolvedPacks();
  const pack = storedPacks.find((existing) => existing.packId === packId);
  if (!pack) {
    throw new Error(`Design pack not found: ${packId}`);
  }

  const [savedItem] = await bulkUpsertInspirationItems([
    {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    },
  ]);

  const updatedItemIds = Array.from(new Set([...pack.itemIds, savedItem.id]));
  await saveStoredPack({
    ...pack,
    itemIds: updatedItemIds,
    updatedAt: new Date().toISOString(),
  });

  return savedItem;
}

export async function removeItemFromDesignPack(
  packId: string,
  itemId: string
): Promise<void> {
  const { storedPacks } = await getResolvedPacks();
  const pack = storedPacks.find((existing) => existing.packId === packId);
  if (!pack) {
    throw new Error(`Design pack not found: ${packId}`);
  }

  await saveStoredPack({
    ...pack,
    itemIds: pack.itemIds.filter((existingItemId) => existingItemId !== itemId),
    updatedAt: new Date().toISOString(),
  });
}

export async function reorderDesignPackItems(
  packId: string,
  itemIds: string[]
): Promise<void> {
  const { storedPacks } = await getResolvedPacks();
  const pack = storedPacks.find((existing) => existing.packId === packId);
  if (!pack) {
    throw new Error(`Design pack not found: ${packId}`);
  }

  const itemIdSet = new Set(itemIds);
  const reordered = [
    ...itemIds.filter((itemId) => pack.itemIds.includes(itemId)),
    ...pack.itemIds.filter((itemId) => !itemIdSet.has(itemId)),
  ];

  await saveStoredPack({
    ...pack,
    itemIds: reordered,
    updatedAt: new Date().toISOString(),
  });
}

export async function createDesignPackFromLegacyItems(
  name: string,
  legacyItems: Array<{
    id: string;
    type: InspirationItem["type"];
    title: string;
    sourceUrl?: string;
    content?: string;
    storagePath?: string;
  }>
): Promise<DesignPack> {
  return createDesignPack({
    name,
    items: legacyItems.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      sourceUrl: item.sourceUrl,
      content: item.content,
      storagePath: item.storagePath,
      createdAt: new Date(),
    })),
  });
}

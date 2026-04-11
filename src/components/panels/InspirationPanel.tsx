import { useEffect, useMemo, useRef, useState } from "react";
import { X, Plus, Upload, Loader2, CloudDownload, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInspirationStore } from "@/stores/inspirationStore";
import { useWizardStore } from "@/stores/wizardStore";
import { useAuthStore } from "@/stores/authStore";
import { useDesignPackStore } from "@/stores/designPackStore";
import { cn } from "@/lib/utils";
import { getInspirationIcon } from "@/lib/inspiration-icons";
import { useInspirationDrop } from "@/hooks/useInspirationDrop";
import { DesignPacksPanel } from "@/components/design-packs";

export function InspirationPanel() {
  const {
    items,
    isLoading,
    addItem,
    removeItem,
    fetchItems,
    importLegacyCloudItems,
  } = useInspirationStore();
  const createPack = useDesignPackStore((state) => state.createPack);
  const loadPacks = useDesignPackStore((state) => state.loadPacks);
  const isWizardOpen = useWizardStore((state) => state.isOpen);
  const { user } = useAuthStore();
  const prevWizardOpenRef = useRef(isWizardOpen);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchItems();
      loadPacks();
    }
  }, [user, fetchItems, loadPacks]);

  useEffect(() => {
    if (prevWizardOpenRef.current && !isWizardOpen && user) {
      fetchItems();
      loadPacks();
    }
    prevWizardOpenRef.current = isWizardOpen;
  }, [isWizardOpen, user, fetchItems, loadPacks]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds]
  );

  const toggleSelectedItem = (itemId: string) => {
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((existingId) => existingId !== itemId)
        : [...current, itemId]
    );
  };

  const { handleDrop, handleDragOver } = useInspirationDrop({
    onAddItem: (item) => addItem(item),
  });

  const handleAddUrl = async () => {
    const url = prompt("Enter a URL for inspiration:");
    if (url && url.startsWith("http")) {
      try {
        await addItem({
          type: "url",
          title: new URL(url).hostname,
          sourceUrl: url,
        });
      } catch {
        // Error handled by store toast
      }
    }
  };

  const handleCreatePack = async () => {
    if (selectedItems.length === 0) {
      return;
    }

    const name = prompt("Name this inspiration pack:");
    if (!name?.trim()) {
      return;
    }

    await createPack({
      name: name.trim(),
      items: selectedItems,
    });
    setSelectedItemIds([]);
  };

  const handleImportCloud = async () => {
    await importLegacyCloudItems().catch(() => {});
    await loadPacks();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Inspiration</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleImportCloud}
            title="Import from cloud"
          >
            <CloudDownload className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleAddUrl}
            title="Add URL"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Inspiration is stored locally and available offline. Cloud import is only for migrating older library items.
      </p>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
          "hover:border-primary/50 hover:bg-primary/5",
          items.length === 0 ? "py-6" : "py-2"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 mx-auto text-muted-foreground/50 animate-spin" />
        ) : items.length === 0 ? (
          <>
            <Upload className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">
              Drop URLs, PDFs, or images here
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Drop more files here</p>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Local Library
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreatePack}
              disabled={selectedItems.length === 0}
            >
              <PackagePlus className="h-3 w-3 mr-1" />
              Create Pack
            </Button>
          </div>

          {items.map((item) => {
            const Icon = getInspirationIcon(item.type);
            const isSelected = selectedItemIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md border group transition-colors",
                  isSelected ? "border-primary bg-primary/5" : "bg-secondary/40"
                )}
              >
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => toggleSelectedItem(item.id)}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center",
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/50"
                    )}
                  >
                    {isSelected ? <span className="h-2 w-2 rounded-sm bg-primary-foreground" /> : null}
                  </div>
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs truncate flex-1">{item.title}</span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    setSelectedItemIds((current) =>
                      current.filter((existingId) => existingId !== item.id)
                    );
                    removeItem(item.id).catch(() => {});
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground text-center">
            {items.length} local item{items.length !== 1 ? "s" : ""}
            {selectedItems.length > 0
              ? `, ${selectedItems.length} selected for a new pack`
              : ""}
          </p>
        </div>
      )}

      <div className="border-t pt-3">
        <DesignPacksPanel />
      </div>
    </div>
  );
}

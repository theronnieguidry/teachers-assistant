import { useCallback, useEffect, useState } from "react";
import {
  Link,
  FileText,
  Image,
  X,
  Plus,
  Upload,
  Loader2,
  Package,
  Pencil,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useDesignPackStore } from "@/stores/designPackStore";
import { cn } from "@/lib/utils";
import type { DesignPack, DesignPackItem } from "@/types";

// Helper to read file as base64
async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

const getIcon = (type: string) => {
  switch (type) {
    case "url":
      return Link;
    case "pdf":
      return FileText;
    case "image":
      return Image;
    default:
      return FileText;
  }
};

export function DesignPacksPanel() {
  const {
    packs,
    isLoading,
    selectedPackId,
    loadPacks,
    createPack,
    deletePack,
    addItem,
    removeItem,
    selectPack,
  } = useDesignPackStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPackName, setNewPackName] = useState("");
  const [expandedPackId, setExpandedPackId] = useState<string | null>(null);

  // Load packs on mount
  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  // Auto-expand selected pack
  useEffect(() => {
    if (selectedPackId) {
      setExpandedPackId(selectedPackId);
    }
  }, [selectedPackId]);

  const handleCreatePack = async () => {
    if (!newPackName.trim()) return;

    try {
      const pack = await createPack({ name: newPackName.trim() });
      setNewPackName("");
      setIsCreateDialogOpen(false);
      setExpandedPackId(pack.packId);
      selectPack(pack.packId);
    } catch {
      // Error handled by store
    }
  };

  const handleDeletePack = async (packId: string) => {
    if (confirm("Are you sure you want to delete this design pack?")) {
      await deletePack(packId);
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent, packId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files);
      const text = e.dataTransfer.getData("text/plain");
      const url = e.dataTransfer.getData("text/uri-list");

      // Handle URL drop
      if (url || (text && text.startsWith("http"))) {
        const droppedUrl = url || text;
        try {
          await addItem(packId, {
            type: "url",
            title: new URL(droppedUrl).hostname,
            sourceUrl: droppedUrl,
          });
        } catch {
          // Error handled by store
        }
        return;
      }

      // Handle file drops
      for (const file of files) {
        try {
          if (file.type === "application/pdf") {
            const base64Content = await readFileAsBase64(file);
            await addItem(packId, {
              type: "pdf",
              title: file.name,
              content: base64Content,
            });
          } else if (file.type.startsWith("image/")) {
            const base64Content = await readFileAsBase64(file);
            await addItem(packId, {
              type: "image",
              title: file.name,
              content: base64Content,
              storagePath: file.type,
            });
          }
        } catch {
          // Error handled by store
        }
      }
    },
    [addItem]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAddUrl = async (packId: string) => {
    const url = prompt("Enter a URL for design inspiration:");
    if (url && url.startsWith("http")) {
      try {
        await addItem(packId, {
          type: "url",
          title: new URL(url).hostname,
          sourceUrl: url,
        });
      } catch {
        // Error handled by store
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Design Packs</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsCreateDialogOpen(true)}
          title="Create Design Pack"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Empty state */}
      {packs.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          <Package className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground mb-2">
            Create a Design Pack to save your inspiration items
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            New Pack
          </Button>
        </div>
      )}

      {/* Design packs list */}
      {packs.length > 0 && (
        <div className="space-y-2">
          {packs.map((pack) => (
            <DesignPackCard
              key={pack.packId}
              pack={pack}
              isExpanded={expandedPackId === pack.packId}
              isSelected={selectedPackId === pack.packId}
              onToggleExpand={() =>
                setExpandedPackId(expandedPackId === pack.packId ? null : pack.packId)
              }
              onSelect={() => selectPack(selectedPackId === pack.packId ? null : pack.packId)}
              onDelete={() => handleDeletePack(pack.packId)}
              onAddUrl={() => handleAddUrl(pack.packId)}
              onRemoveItem={(itemId) => removeItem(pack.packId, itemId)}
              onDrop={(e) => handleDrop(e, pack.packId)}
              onDragOver={handleDragOver}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Design Pack</DialogTitle>
            <DialogDescription>
              Create a new design pack to organize your inspiration items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pack-name">Pack Name</Label>
              <Input
                id="pack-name"
                placeholder="e.g., Spring Theme, Math Worksheets"
                value={newPackName}
                onChange={(e) => setNewPackName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreatePack()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePack} disabled={!newPackName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DesignPackCardProps {
  pack: DesignPack;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onDelete: () => void;
  onAddUrl: () => void;
  onRemoveItem: (itemId: string) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

function DesignPackCard({
  pack,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  onDelete,
  onAddUrl,
  onRemoveItem,
  onDrop,
  onDragOver,
}: DesignPackCardProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div
        className={cn(
          "rounded-lg border transition-colors",
          isSelected && "border-primary bg-primary/5"
        )}
      >
        <div className="flex items-center gap-2 p-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <div
            className="flex-1 flex items-center gap-2 cursor-pointer"
            onClick={onSelect}
          >
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate">{pack.name}</span>
            <span className="text-xs text-muted-foreground">
              ({pack.items.length})
            </span>
          </div>

          {isSelected && (
            <Check className="h-4 w-4 text-primary" />
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-50 hover:opacity-100"
            onClick={onAddUrl}
            title="Add URL"
          >
            <Plus className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-50 hover:opacity-100 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete Pack"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <CollapsibleContent>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className={cn(
              "border-t mx-2 mb-2 p-2 rounded border-dashed",
              "hover:border-primary/50 hover:bg-primary/5 transition-colors"
            )}
          >
            {pack.items.length === 0 ? (
              <div className="text-center py-2">
                <Upload className="h-4 w-4 mx-auto text-muted-foreground/50 mb-1" />
                <p className="text-xs text-muted-foreground">
                  Drop URLs, PDFs, or images
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {pack.items.map((item) => {
                  const Icon = getIcon(item.type);
                  return (
                    <div
                      key={item.itemId}
                      className="flex items-center gap-2 p-1 rounded bg-secondary/50 group"
                    >
                      <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs truncate flex-1">{item.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemoveItem(item.itemId)}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Drop more files here
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

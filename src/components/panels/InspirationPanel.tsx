import { useCallback, useEffect, useRef } from "react";
import {
  Link,
  FileText,
  Image,
  X,
  Plus,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInspirationStore } from "@/stores/inspirationStore";
import { useWizardStore } from "@/stores/wizardStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

// Helper to read file as base64
async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function InspirationPanel() {
  const { items, isLoading, addItem, removeItem, fetchItems } = useInspirationStore();
  const isWizardOpen = useWizardStore((state) => state.isOpen);
  const { user } = useAuthStore();
  const prevWizardOpenRef = useRef(isWizardOpen);

  // Load inspiration items when user is authenticated
  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user, fetchItems]);

  // Re-fetch when wizard closes to show newly persisted items
  useEffect(() => {
    if (prevWizardOpenRef.current && !isWizardOpen && user) {
      // Wizard just closed - re-fetch to get any newly persisted items
      fetchItems();
    }
    prevWizardOpenRef.current = isWizardOpen;
  }, [isWizardOpen, user, fetchItems]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files);
      const text = e.dataTransfer.getData("text/plain");
      const url = e.dataTransfer.getData("text/uri-list");

      // Handle URL drop
      if (url || (text && text.startsWith("http"))) {
        const droppedUrl = url || text;
        try {
          await addItem({
            type: "url",
            title: new URL(droppedUrl).hostname,
            sourceUrl: droppedUrl,
          });
        } catch {
          // Error handled by store
        }
        return;
      }

      // Handle file drops - read files as base64 for backend processing
      for (const file of files) {
        try {
          if (file.type === "application/pdf") {
            const base64Content = await readFileAsBase64(file);
            await addItem({
              type: "pdf",
              title: file.name,
              content: base64Content,
            });
          } else if (file.type.startsWith("image/")) {
            const base64Content = await readFileAsBase64(file);
            const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
            await addItem({
              type: "image",
              title: file.name,
              content: base64Content,
              storagePath: mediaType, // Store media type for vision API
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Design Inspiration
        </h2>
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

      {/* Drop zone */}
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
          <p className="text-xs text-muted-foreground">
            Drop more files here
          </p>
        )}
      </div>

      {/* Inspiration items */}
      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = getIcon(item.type);
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 group"
              >
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs truncate flex-1">{item.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeItem(item.id).catch(() => {})}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {items.length} item{items.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}

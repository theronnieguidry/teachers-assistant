import { useCallback } from "react";
import {
  Link,
  FileText,
  Image,
  X,
  Plus,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInspirationStore } from "@/stores/inspirationStore";
import { cn } from "@/lib/utils";

export function InspirationPanel() {
  const { items, addItem, removeItem } = useInspirationStore();

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files);
      const text = e.dataTransfer.getData("text/plain");
      const url = e.dataTransfer.getData("text/uri-list");

      // Handle URL drop
      if (url || (text && text.startsWith("http"))) {
        const droppedUrl = url || text;
        addItem({
          type: "url",
          title: new URL(droppedUrl).hostname,
          sourceUrl: droppedUrl,
        });
        return;
      }

      // Handle file drops
      files.forEach((file) => {
        if (file.type === "application/pdf") {
          addItem({
            type: "pdf",
            title: file.name,
            content: file.name, // In real app, would extract text
          });
        } else if (file.type.startsWith("image/")) {
          addItem({
            type: "image",
            title: file.name,
          });
        }
      });
    },
    [addItem]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAddUrl = () => {
    const url = prompt("Enter a URL for inspiration:");
    if (url && url.startsWith("http")) {
      try {
        addItem({
          type: "url",
          title: new URL(url).hostname,
          sourceUrl: url,
        });
      } catch {
        alert("Please enter a valid URL");
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
        {items.length === 0 ? (
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
                  onClick={() => removeItem(item.id)}
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

import { useCallback, useState } from "react";
import { Link, FileText, Image, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/stores/wizardStore";
import { useInspirationStore } from "@/stores/inspirationStore";
import { cn } from "@/lib/utils";
import type { InspirationItem } from "@/types";

export function InspirationStep() {
  const { selectedInspiration, setSelectedInspiration, nextStep, prevStep } =
    useWizardStore();
  const { items: globalItems, addItem } = useInspirationStore();
  const [isDragging, setIsDragging] = useState(false);

  const toggleItem = (item: InspirationItem) => {
    const isSelected = selectedInspiration.some((i) => i.id === item.id);
    if (isSelected) {
      setSelectedInspiration(
        selectedInspiration.filter((i) => i.id !== item.id)
      );
    } else {
      setSelectedInspiration([...selectedInspiration, item]);
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

  const handleAddUrl = () => {
    const url = prompt("Enter a URL for inspiration:");
    if (url && url.startsWith("http")) {
      try {
        const newItem = addItem({
          type: "url",
          title: new URL(url).hostname,
          sourceUrl: url,
        });
        // Auto-select the newly added item
        if (newItem) {
          setSelectedInspiration([...selectedInspiration, newItem]);
        }
      } catch {
        alert("Please enter a valid URL");
      }
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const text = e.dataTransfer.getData("text/plain");
      const url = e.dataTransfer.getData("text/uri-list");

      // Handle URL drop
      if (url || (text && text.startsWith("http"))) {
        const droppedUrl = url || text;
        const newItem = addItem({
          type: "url",
          title: new URL(droppedUrl).hostname,
          sourceUrl: droppedUrl,
        });
        if (newItem) {
          setSelectedInspiration([...selectedInspiration, newItem]);
        }
        return;
      }

      // Handle file drops
      const newItems: InspirationItem[] = [];
      files.forEach((file) => {
        if (file.type === "application/pdf") {
          const newItem = addItem({
            type: "pdf",
            title: file.name,
            content: file.name,
          });
          if (newItem) newItems.push(newItem);
        } else if (file.type.startsWith("image/")) {
          const newItem = addItem({
            type: "image",
            title: file.name,
          });
          if (newItem) newItems.push(newItem);
        }
      });
      if (newItems.length > 0) {
        setSelectedInspiration([...selectedInspiration, ...newItems]);
      }
    },
    [addItem, selectedInspiration, setSelectedInspiration]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleContinue = () => {
    nextStep();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select inspiration items to guide the AI in creating your materials.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddUrl}
          className="flex-shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add URL
        </Button>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/10"
            : "hover:border-primary/50 hover:bg-primary/5",
          globalItems.length === 0 ? "py-6" : "py-2"
        )}
      >
        {globalItems.length === 0 ? (
          <>
            <Upload className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">
              Drop URLs, PDFs, or images here
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Drop more files here to add
          </p>
        )}
      </div>

      {globalItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center">
          No inspiration items yet. Add URLs or drop files above.
        </p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-auto">
          {globalItems.map((item) => {
            const Icon = getIcon(item.type);
            const isSelected = selectedInspiration.some(
              (i) => i.id === item.id
            );

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                )}
                onClick={() => toggleItem(item)}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  )}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-primary-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{item.title}</span>
                <span className="text-xs text-muted-foreground uppercase">
                  {item.type}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {selectedInspiration.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedInspiration.length} item
          {selectedInspiration.length !== 1 ? "s" : ""} selected
        </p>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={handleContinue}>
          {selectedInspiration.length === 0 ? "Skip" : "Next"}
        </Button>
      </div>
    </div>
  );
}

import { useCallback, useState } from "react";
import { readFileAsBase64 } from "@/lib/file-encoding";

export interface DropInspirationInput {
  type: "url" | "pdf" | "image";
  title: string;
  sourceUrl?: string;
  content?: string;
  storagePath?: string;
}

interface UseInspirationDropOptions<TItem> {
  onAddItem: (item: DropInspirationInput) => Promise<TItem> | TItem;
  onItemsAdded?: (items: TItem[]) => Promise<void> | void;
  onError?: (error: unknown, context?: string) => void;
}

export function useInspirationDrop<TItem>({
  onAddItem,
  onItemsAdded,
  onError,
}: UseInspirationDropOptions<TItem>) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files || []);
      const text = e.dataTransfer.getData("text/plain");
      const url = e.dataTransfer.getData("text/uri-list");
      const addedItems: TItem[] = [];

      // Handle URL drops before file parsing.
      const droppedUrl = url || text;
      if (droppedUrl && droppedUrl.startsWith("http")) {
        try {
          const parsedUrl = new URL(droppedUrl);
          const newItem = await onAddItem({
            type: "url",
            title: parsedUrl.hostname,
            sourceUrl: droppedUrl,
          });
          addedItems.push(newItem);
        } catch (error) {
          onError?.(error, droppedUrl);
        }
      } else {
        for (const file of files) {
          try {
            if (file.type === "application/pdf") {
              const base64Content = await readFileAsBase64(file);
              const newItem = await onAddItem({
                type: "pdf",
                title: file.name,
                content: base64Content,
              });
              addedItems.push(newItem);
            } else if (file.type.startsWith("image/")) {
              const base64Content = await readFileAsBase64(file);
              const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
              const newItem = await onAddItem({
                type: "image",
                title: file.name,
                content: base64Content,
                storagePath: mediaType,
              });
              addedItems.push(newItem);
            }
          } catch (error) {
            onError?.(error, file.name);
          }
        }
      }

      if (addedItems.length > 0) {
        await onItemsAdded?.(addedItems);
      }
    },
    [onAddItem, onItemsAdded, onError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  return {
    isDragging,
    handleDrop,
    handleDragOver,
    handleDragLeave,
  };
}

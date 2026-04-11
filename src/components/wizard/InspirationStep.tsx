import { useEffect } from "react";
import { Plus, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/stores/wizardStore";
import { useInspirationStore } from "@/stores/inspirationStore";
import { useDesignPackStore } from "@/stores/designPackStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { getInspirationIcon } from "@/lib/inspiration-icons";
import { useInspirationDrop } from "@/hooks/useInspirationDrop";

export function InspirationStep() {
  const { selectedInspirationIds, setSelectedInspirationIds, nextStep, prevStep } =
    useWizardStore();
  const selectedPack = useDesignPackStore((state) => state.getSelectedPack());
  const { items: globalItems, isLoading, addItem, fetchItems } = useInspirationStore();
  const { user } = useAuthStore();
  const selectedItemIds = new Set(selectedInspirationIds);
  const selectedItems = globalItems.filter((item) => selectedItemIds.has(item.id));

  // Load inspiration items if not already loaded
  useEffect(() => {
    if (user && globalItems.length === 0) {
      fetchItems();
    }
  }, [user, globalItems.length, fetchItems]);

  const toggleItem = (itemId: string) => {
    const isSelected = selectedItemIds.has(itemId);
    if (isSelected) {
      setSelectedInspirationIds(
        selectedInspirationIds.filter((existingItemId) => existingItemId !== itemId)
      );
    } else {
      setSelectedInspirationIds([...selectedInspirationIds, itemId]);
    }
  };

  const handleAddUrl = async () => {
    const url = prompt("Enter a URL for inspiration:");
    if (url && url.startsWith("http")) {
      const newItem = await addItem({
        type: "url",
        title: new URL(url).hostname,
        sourceUrl: url,
      });
      setSelectedInspirationIds([...selectedInspirationIds, newItem.id]);
    }
  };

  const { isDragging, handleDrop, handleDragOver, handleDragLeave } =
    useInspirationDrop({
      onAddItem: (item) => addItem(item),
      onItemsAdded: (newItems) => {
        if (newItems.length === 0) return;
        setSelectedInspirationIds(
          Array.from(new Set([...selectedInspirationIds, ...newItems.map((item) => item.id)]))
        );
      },
      onError: (error, context) => {
        console.error(`Failed to process dropped inspiration item: ${context || "unknown"}`, error);
      },
    });

  const handleContinue = () => {
    nextStep();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select local inspiration items to guide the AI in creating your materials.
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

      {selectedPack && (
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-sm font-medium">Selected Pack: {selectedPack.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedPack.items.length} pack item
            {selectedPack.items.length === 1 ? "" : "s"} will be included along with the
            inspiration you select here.
          </p>
        </div>
      )}

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
        {isLoading ? (
          <Loader2 className="h-6 w-6 mx-auto text-muted-foreground/50 animate-spin" />
        ) : globalItems.length === 0 ? (
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
            const Icon = getInspirationIcon(item.type);
            const isSelected = selectedItemIds.has(item.id);

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                )}
                onClick={() => toggleItem(item.id)}
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

      {selectedItems.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedItems.length} item
          {selectedItems.length !== 1 ? "s" : ""} selected
        </p>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={handleContinue}>
          {selectedItems.length === 0 ? "Skip" : "Next"}
        </Button>
      </div>
    </div>
  );
}

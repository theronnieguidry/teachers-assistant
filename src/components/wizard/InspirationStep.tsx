import { Link, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/stores/wizardStore";
import { useInspirationStore } from "@/stores/inspirationStore";
import { cn } from "@/lib/utils";
import type { InspirationItem } from "@/types";

export function InspirationStep() {
  const { selectedInspiration, setSelectedInspiration, nextStep, prevStep } =
    useWizardStore();
  const globalItems = useInspirationStore((state) => state.items);

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

  const handleContinue = () => {
    nextStep();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select inspiration items to guide the AI in creating your materials.
        This is optional but recommended for better results.
      </p>

      {globalItems.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-2">No inspiration items yet</p>
          <p className="text-sm text-muted-foreground">
            Add URLs, PDFs, or images in the left panel to use as inspiration
          </p>
        </div>
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

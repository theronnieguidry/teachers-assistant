import { useState } from "react";
import { Wand2, Loader2, ChevronDown, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/stores/toastStore";
import {
  applyImprovement,
  IMPROVEMENT_OPTIONS,
  ImproveApiError,
} from "@/services/improve-api";
import type { ImprovementType } from "@/types";

interface ImproveMenuProps {
  projectId: string;
  versionId: string;
  activeTab: "worksheet" | "lesson_plan" | "answer_key";
  onImproved: (newVersionId: string) => void;
  disabled?: boolean;
}

export function ImproveMenu({
  projectId,
  versionId,
  activeTab,
  onImproved,
  disabled = false,
}: ImproveMenuProps) {
  const { session } = useAuthStore();
  const { credits } = useAuth();
  const [isApplying, setIsApplying] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedImprovement, setSelectedImprovement] = useState<{
    type: ImprovementType;
    label: string;
    estimatedCredits: number;
  } | null>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  const handleSelectImprovement = (improvement: typeof selectedImprovement) => {
    setSelectedImprovement(improvement);
    setAdditionalInstructions("");
    setConfirmDialogOpen(true);
  };

  const handleConfirmImprovement = async () => {
    if (!selectedImprovement || !session?.access_token) return;

    setIsApplying(true);

    try {
      const result = await applyImprovement(
        {
          projectId,
          versionId,
          improvementType: selectedImprovement.type,
          targetDocument: activeTab,
          additionalInstructions: additionalInstructions || undefined,
        },
        session.access_token
      );

      toast.success(
        "Improvement Applied",
        `${selectedImprovement.label} complete. ${result.creditsUsed} credits used.`
      );

      setConfirmDialogOpen(false);
      onImproved(result.newVersionId);
    } catch (error) {
      console.error("Improvement failed:", error);

      if (error instanceof ImproveApiError && error.statusCode === 402) {
        toast.error(
          "Insufficient Credits",
          `You need ${selectedImprovement.estimatedCredits} credits for this improvement.`
        );
      } else {
        toast.error(
          "Improvement Failed",
          error instanceof Error ? error.message : "An error occurred"
        );
      }
    } finally {
      setIsApplying(false);
    }
  };

  const hasEnoughCredits = (requiredCredits: number) => {
    return credits && credits.balance >= requiredCredits;
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case "worksheet":
        return "worksheet";
      case "lesson_plan":
        return "lesson plan";
      case "answer_key":
        return "answer key";
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isApplying}
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-1" />
            )}
            Improve
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Improve this {getTabLabel()}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {IMPROVEMENT_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.type}
              onClick={() =>
                handleSelectImprovement({
                  type: option.type,
                  label: option.label,
                  estimatedCredits: option.estimatedCredits,
                })
              }
              disabled={!hasEnoughCredits(option.estimatedCredits)}
              className="flex flex-col items-start py-2"
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground flex items-center">
                  <Coins className="h-3 w-3 mr-1" />
                  {option.estimatedCredits}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedImprovement?.label}</DialogTitle>
            <DialogDescription>
              This improvement will use approximately{" "}
              <strong>{selectedImprovement?.estimatedCredits} credits</strong>.
              A new version will be created with the changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instructions">
                Additional Instructions (optional)
              </Label>
              <Textarea
                id="instructions"
                placeholder="Any specific changes you'd like? e.g., 'Focus on question 3' or 'Use simpler words for a struggling reader'"
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Your balance</span>
              <span className="font-medium">
                {credits?.balance ?? 0} credits
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isApplying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmImprovement}
              disabled={
                isApplying ||
                !hasEnoughCredits(selectedImprovement?.estimatedCredits ?? 0)
              }
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Apply Improvement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, Coins, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWizardStore } from "@/stores/wizardStore";
import { useAuth } from "@/hooks/useAuth";
import { ProviderSelector } from "./ProviderSelector";
import { VisualOptionsPanel } from "./VisualOptionsPanel";
import { PurchaseDialog } from "@/components/purchase";

// Minimum credits required to start a Premium AI generation
const MINIMUM_CREDITS = 5;

export function AIProviderStep() {
  const {
    aiProvider,
    setAiProvider,
    visualSettings,
    setVisualSettings,
    classDetails,
    selectedInspiration,
    nextStep,
    prevStep,
  } = useWizardStore();

  const { credits } = useAuth();
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  // Check if user has enough credits for Premium AI
  const hasEnoughCredits = credits && credits.balance >= MINIMUM_CREDITS;
  const showInsufficientCredits = aiProvider === "premium" && !hasEnoughCredits;

  // Can proceed if: Premium AI with enough credits, or Local AI (backend-managed model)
  const canProceed = aiProvider === "local" || hasEnoughCredits;

  // Check if there are design inspirations selected (images, PDFs, URLs)
  const hasDesignInspiration = selectedInspiration.some(
    (item) => item.type === "image" || item.type === "pdf" || item.type === "url"
  );

  // Show warning if Local AI selected with design inspiration
  const showDesignWarning = aiProvider === "local" && hasDesignInspiration;

  // Show soft-limit warning for grades 4-6
  const gradeNum = classDetails?.grade ? parseInt(classDetails.grade) : 0;
  const showGradeWarning = aiProvider === "premium" && gradeNum >= 4 && !isNaN(gradeNum);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose which AI will generate your teaching materials.
      </p>

      <div className="space-y-3">
        <Label>AI Provider</Label>
        <ProviderSelector
          value={aiProvider}
          onChange={setAiProvider}
        />
      </div>

      {showInsufficientCredits && (
        <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <Coins className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <div className="flex flex-col gap-2">
              <div>
                <strong>Insufficient credits for Premium AI.</strong> You have{" "}
                {credits?.balance ?? 0} credits, but need at least {MINIMUM_CREDITS} to start.
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPurchaseDialogOpen(true)}
                >
                  <Coins className="h-3 w-3 mr-1" />
                  Add Credits
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAiProvider("local")}
                >
                  Switch to Local AI (Free)
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {showDesignWarning && (
        <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <strong>Design inspiration will be limited.</strong> Local AI cannot
            analyze visual designs from images, PDFs, or websites. Only text
            content will be extracted. For full design analysis (colors, layout,
            typography), consider using Premium AI.
          </AlertDescription>
        </Alert>
      )}

      {showGradeWarning && (
        <Alert variant="default" className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            <strong>Best results for K-3.</strong> Grades 4-6 are supported but
            content quality is optimized for K-3. The premium pipeline includes
            grade-appropriate vocabulary and pedagogy checks.
          </AlertDescription>
        </Alert>
      )}

      {aiProvider === "premium" && (
        <div className="space-y-3">
          <Label>Visual Options</Label>
          <VisualOptionsPanel
            settings={visualSettings}
            onChange={setVisualSettings}
          />
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button onClick={nextStep} disabled={!canProceed}>
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <PurchaseDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
      />
    </div>
  );
}

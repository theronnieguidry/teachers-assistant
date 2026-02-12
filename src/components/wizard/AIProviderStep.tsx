import { useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWizardStore } from "@/stores/wizardStore";
import { useAuth } from "@/hooks/useAuth";
import { ProviderSelector } from "./ProviderSelector";
import { VisualOptionsPanel } from "./VisualOptionsPanel";
import { PurchaseDialog } from "@/components/purchase";
import { isHostedApiBaseUrl, useSettingsStore } from "@/stores/settingsStore";
import { K6SoftLimitAlert } from "./K6SoftLimitAlert";

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
  const resolvedApiBaseUrl = useSettingsStore((state) =>
    state.getResolvedApiBaseUrl()
  );
  const allowPremiumOnLocalDev = useSettingsStore(
    (state) => state.allowPremiumOnLocalDev
  );
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  // Check if user has enough credits for Premium AI
  const hasEnoughCredits = (credits?.balance ?? 0) >= MINIMUM_CREDITS;
  const premiumAllowedByEndpoint =
    isHostedApiBaseUrl(resolvedApiBaseUrl) || allowPremiumOnLocalDev;
  const showPremiumEndpointWarning =
    aiProvider === "premium" && !premiumAllowedByEndpoint;
  const showInsufficientCredits =
    aiProvider === "premium" && premiumAllowedByEndpoint && !hasEnoughCredits;

  // Can proceed if: Premium AI with enough credits, or Local AI (backend-managed model)
  const canProceed =
    aiProvider === "local" || (premiumAllowedByEndpoint && hasEnoughCredits);

  // Check if there are design inspirations selected (images, PDFs, URLs)
  const hasDesignInspiration = selectedInspiration.some(
    (item) => item.type === "image" || item.type === "pdf" || item.type === "url"
  );

  // Show warning if Local AI selected with design inspiration
  const showDesignWarning = aiProvider === "local" && hasDesignInspiration;

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
          premiumDisabled={!premiumAllowedByEndpoint}
          premiumDisabledReason={`Premium requires a hosted HTTPS API endpoint. Current: ${resolvedApiBaseUrl}`}
        />
      </div>

      {showPremiumEndpointWarning && (
        <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <div className="flex flex-col gap-2">
              <div>
                <strong>Premium AI is disabled on this endpoint.</strong> Premium requires a hosted HTTPS API endpoint to keep provider keys off teacher machines.
              </div>
              <div className="text-xs">
                Active endpoint: <code>{resolvedApiBaseUrl}</code>
              </div>
              <div className="flex gap-2">
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

      <K6SoftLimitAlert grade={classDetails?.grade} />

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

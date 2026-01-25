import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWizardStore } from "@/stores/wizardStore";
import { ProviderSelector } from "./ProviderSelector";

export function AIProviderStep() {
  const {
    aiProvider,
    setAiProvider,
    ollamaModel,
    setOllamaModel,
    selectedInspiration,
    nextStep,
    prevStep,
  } = useWizardStore();

  // Disable next if Ollama is selected but no model is chosen
  const canProceed =
    aiProvider !== "ollama" || (aiProvider === "ollama" && ollamaModel);

  // Check if there are image inspirations selected
  const hasImageInspiration = selectedInspiration.some(
    (item) => item.type === "image"
  );

  // Show warning if Ollama selected with image inspiration
  const showImageWarning = aiProvider === "ollama" && hasImageInspiration;

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
          ollamaModel={ollamaModel}
          onOllamaModelChange={setOllamaModel}
        />
      </div>

      {showImageWarning && (
        <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <strong>Image inspiration won't be analyzed.</strong> Ollama cannot
            analyze images for design inspiration. Your image files will be
            included by name only. Consider using Claude or OpenAI for
            image-based design guidance, or add a text description of your
            desired design style.
          </AlertDescription>
        </Alert>
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
    </div>
  );
}

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useWizardStore } from "@/stores/wizardStore";
import { ProviderSelector } from "./ProviderSelector";

export function AIProviderStep() {
  const {
    aiProvider,
    setAiProvider,
    ollamaModel,
    setOllamaModel,
    nextStep,
    prevStep,
  } = useWizardStore();

  // Disable next if Ollama is selected but no model is chosen
  const canProceed =
    aiProvider !== "ollama" || (aiProvider === "ollama" && ollamaModel);

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

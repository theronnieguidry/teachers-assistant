import { useWizardStore } from "@/stores/wizardStore";
import { ClassDetailsStep } from "./ClassDetailsStep";
import { InspirationStep } from "./InspirationStep";
import { AIProviderStep } from "./AIProviderStep";
import { OutputStep } from "./OutputStep";
import { PromptReviewStep } from "./PromptReviewStep";
import { GenerationStep } from "./GenerationStep";

export function WizardSteps() {
  const currentStep = useWizardStore((state) => state.currentStep);

  switch (currentStep) {
    case 1:
      return <ClassDetailsStep />;
    case 2:
      return <InspirationStep />;
    case 3:
      return <AIProviderStep />;
    case 4:
      return <OutputStep />;
    case 5:
      return <PromptReviewStep />;
    case 6:
      return <GenerationStep />;
    default:
      return null;
  }
}

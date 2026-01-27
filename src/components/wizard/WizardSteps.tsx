import { useWizardStore } from "@/stores/wizardStore";
import { ProjectSelectionStep } from "./ProjectSelectionStep";
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
      return <ProjectSelectionStep />;
    case 2:
      return <ClassDetailsStep />;
    case 3:
      return <InspirationStep />;
    case 4:
      return <AIProviderStep />;
    case 5:
      return <OutputStep />;
    case 6:
      return <PromptReviewStep />;
    case 7:
      return <GenerationStep />;
    default:
      return null;
  }
}

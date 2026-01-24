import { useWizardStore } from "@/stores/wizardStore";
import { ClassDetailsStep } from "./ClassDetailsStep";
import { InspirationStep } from "./InspirationStep";
import { OutputStep } from "./OutputStep";
import { GenerationStep } from "./GenerationStep";

export function WizardSteps() {
  const currentStep = useWizardStore((state) => state.currentStep);

  switch (currentStep) {
    case 1:
      return <ClassDetailsStep />;
    case 2:
      return <InspirationStep />;
    case 3:
      return <OutputStep />;
    case 4:
      return <GenerationStep />;
    default:
      return null;
  }
}

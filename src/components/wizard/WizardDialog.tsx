import { useWizardStore } from "@/stores/wizardStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WizardSteps } from "./WizardSteps";
import { WizardProgress } from "./WizardProgress";

export function WizardDialog() {
  const { isOpen, closeWizard, currentStep, title } = useWizardStore();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeWizard()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {currentStep === 4 ? "Generating..." : `Create: ${title}`}
          </DialogTitle>
        </DialogHeader>

        <WizardProgress />
        <WizardSteps />
      </DialogContent>
    </Dialog>
  );
}

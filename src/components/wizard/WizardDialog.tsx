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
      <DialogContent className="max-w-3xl max-h-[90vh] min-h-[500px] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg">
            {currentStep === 6 ? "Generating..." : `Create: ${title}`}
          </DialogTitle>
        </DialogHeader>

        <WizardProgress />
        <div className="flex-1 overflow-y-auto min-h-0">
          <WizardSteps />
        </div>
      </DialogContent>
    </Dialog>
  );
}

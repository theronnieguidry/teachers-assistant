import { useEffect } from "react";
import { useWizardStore } from "@/stores/wizardStore";
import { useInspirationStore } from "@/stores/inspirationStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WizardSteps } from "./WizardSteps";
import { WizardProgress } from "./WizardProgress";

export function WizardDialog() {
  const { isOpen, closeWizard, currentStep, title, selectedInspiration, regeneratingProjectId } = useWizardStore();
  const { items: globalItems, setItems } = useInspirationStore();

  // When wizard opens for regeneration, sync saved inspiration to global store
  useEffect(() => {
    if (isOpen && regeneratingProjectId && selectedInspiration.length > 0) {
      // Merge with existing items (avoid duplicates by ID)
      const existingIds = new Set(globalItems.map(i => i.id));
      const itemsToAdd = selectedInspiration.filter(i => !existingIds.has(i.id));
      if (itemsToAdd.length > 0) {
        setItems([...globalItems, ...itemsToAdd]);
      }
    }
  }, [isOpen, regeneratingProjectId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeWizard()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {currentStep === 6 ? "Generating..." : `Create: ${title}`}
          </DialogTitle>
        </DialogHeader>

        <WizardProgress />
        <WizardSteps />
      </DialogContent>
    </Dialog>
  );
}

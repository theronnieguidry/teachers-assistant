import { AppLayout } from "./AppLayout";
import { MainContent } from "./MainContent";
import { WizardDialog } from "@/components/wizard/WizardDialog";

export function Dashboard() {
  return (
    <AppLayout>
      <MainContent />
      <WizardDialog />
    </AppLayout>
  );
}

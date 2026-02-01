import { useEffect, useRef } from "react";
import { AppLayout } from "./AppLayout";
import { MainContent } from "./MainContent";
import { WizardDialog } from "@/components/wizard/WizardDialog";
import { useProjectStore } from "@/stores/projectStore";
import { isMigrationNeeded, runMigration } from "@/lib/migration";
import { saveArtifact } from "@/services/library-storage";
import { saveLocalProject } from "@/services/local-project-storage";
import { saveDesignPack } from "@/services/design-pack-storage";

export function Dashboard() {
  const migrationAttempted = useRef(false);
  const { projects, fetchProjects } = useProjectStore();

  // Run one-time migration of legacy projects to unified format (Issue #20)
  useEffect(() => {
    if (migrationAttempted.current || !isMigrationNeeded()) return;
    migrationAttempted.current = true;

    (async () => {
      try {
        // Fetch legacy projects from Supabase if not already loaded
        if (projects.length === 0) {
          await fetchProjects();
        }
        const legacyProjects = useProjectStore.getState().projects;
        if (legacyProjects.length === 0) return;

        console.log(`[Migration] Migrating ${legacyProjects.length} legacy projects...`);
        const status = await runMigration(
          legacyProjects,
          saveLocalProject,
          saveArtifact,
          saveDesignPack
        );
        console.log("[Migration] Complete:", status.migratedEntities);
      } catch (error) {
        console.error("[Migration] Failed:", error);
      }
    })();
  }, []);

  return (
    <AppLayout>
      <MainContent />
      <WizardDialog />
    </AppLayout>
  );
}

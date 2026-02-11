import { ReactNode, useState, useEffect } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { UpdateDialog } from "@/components/settings";
import {
  checkForUpdates,
  downloadAndInstallUpdate,
  type UpdateInfo,
} from "@/services/tauri-bridge";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  // Check for updates on startup (silent, in background)
  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const update = await checkForUpdates();
        if (update?.available) {
          setUpdateInfo(update);
          setShowUpdateDialog(true);
        }
      } catch {
        // Silent fail - update check is not critical
      }
    };

    checkUpdates();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* Update available dialog */}
      <UpdateDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        updateInfo={updateInfo}
        onUpdate={downloadAndInstallUpdate}
      />
    </div>
  );
}

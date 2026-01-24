import { ReactNode, useState, useEffect } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { OllamaSetup } from "@/components/settings";
import { checkOllamaStatus } from "@/services/tauri-bridge";

interface AppLayoutProps {
  children: ReactNode;
}

const OLLAMA_SETUP_SEEN_KEY = "ta-ollama-setup-seen";

export function AppLayout({ children }: AppLayoutProps) {
  const [showOllamaSetup, setShowOllamaSetup] = useState(false);

  useEffect(() => {
    // Check if user has already seen the Ollama setup
    const setupSeen = localStorage.getItem(OLLAMA_SETUP_SEEN_KEY);
    if (setupSeen) return;

    // Check Ollama status on first run
    const checkFirstRun = async () => {
      try {
        const status = await checkOllamaStatus();
        // Show setup if Ollama is installed but has no models
        // or if not installed at all
        if (!status.installed || (status.installed && status.models.length === 0)) {
          setShowOllamaSetup(true);
        }
      } catch {
        // If check fails, don't show the dialog (might not be in Tauri context)
      }
    };

    checkFirstRun();
  }, []);

  const handleSetupClose = (open: boolean) => {
    setShowOllamaSetup(open);
    if (!open) {
      // Mark as seen when user closes the dialog
      localStorage.setItem(OLLAMA_SETUP_SEEN_KEY, "true");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* First-run Ollama setup dialog */}
      <OllamaSetup open={showOllamaSetup} onOpenChange={handleSetupClose} />
    </div>
  );
}

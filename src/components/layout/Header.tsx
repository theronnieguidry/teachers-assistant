import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSettingsStore } from "@/stores/settingsStore";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogOut, Coins, GraduationCap, User, Settings } from "lucide-react";
import { OllamaSetup } from "@/components/settings";

export function Header() {
  const { profile, credits, signOut } = useAuth();
  const { defaultAiProvider } = useSettingsStore();
  const [ollamaSetupOpen, setOllamaSetupOpen] = useState(false);

  // Only show credits when using paid providers (Claude/OpenAI)
  const showCredits = defaultAiProvider !== "ollama" && credits;

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary rounded-lg">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">TA</span>
          <span className="text-muted-foreground text-sm hidden sm:inline">
            Teacher's Assistant
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Credits badge - only shown when using Claude/OpenAI */}
          {showCredits && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full cursor-help"
                    aria-label={`API credits: ${credits.balance}`}
                    role="status"
                  >
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">{credits.balance}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <div className="text-sm space-y-1">
                    <p className="font-medium">API Credits: {credits.balance}</p>
                    <p className="text-primary-foreground/80">
                      Used: {credits.lifetimeUsed} of {credits.lifetimeGranted}
                    </p>
                    <p className="text-xs text-primary-foreground/70 pt-1">
                      Credits are consumed when generating with Claude or OpenAI.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOllamaSetupOpen(true)}
            title="Local AI Setup"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* User info */}
          <div className="flex items-center gap-2 pl-2 border-l">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground hidden md:inline max-w-[150px] truncate">
              {profile?.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Ollama Setup Dialog */}
      <OllamaSetup open={ollamaSetupOpen} onOpenChange={setOllamaSetupOpen} />
    </header>
  );
}

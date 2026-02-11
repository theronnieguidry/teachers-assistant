import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogOut, Coins, GraduationCap, User } from "lucide-react";
import { FeedbackButton } from "@/components/feedback";
import { PurchaseDialog } from "@/components/purchase";
import { LearnerSwitcher } from "@/components/learner";

export function Header() {
  const { profile, credits, signOut } = useAuth();
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  // Always show credits badge when available (users may switch between Premium and Local AI)
  const showCredits = credits !== null;

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
          {/* Credits badge - clickable to open purchase dialog */}
          {showCredits && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1.5 px-3 py-1.5 h-auto bg-secondary hover:bg-secondary/80 rounded-full"
                    onClick={() => setPurchaseDialogOpen(true)}
                    aria-label={`Premium AI credits: ${credits.balance}. Click to buy more.`}
                  >
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">{credits.balance}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Premium AI Credits: {credits.balance}</p>
                    <p className="text-primary-foreground/80">
                      Used: {credits.lifetimeUsed} of {credits.lifetimeGranted}
                    </p>
                    <p className="text-xs text-primary-foreground/70 pt-1">
                      Click to buy more credits
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Learner Switcher */}
          <LearnerSwitcher compact />

          {/* Feedback */}
          <FeedbackButton />

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

      {/* Purchase Dialog */}
      <PurchaseDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
      />
    </header>
  );
}

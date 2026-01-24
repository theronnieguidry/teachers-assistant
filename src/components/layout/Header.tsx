import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Coins, GraduationCap, User } from "lucide-react";

export function Header() {
  const { profile, credits, signOut } = useAuth();

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
          {/* Credits badge */}
          {credits && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full">
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">{credits.balance}</span>
            </div>
          )}

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
    </header>
  );
}

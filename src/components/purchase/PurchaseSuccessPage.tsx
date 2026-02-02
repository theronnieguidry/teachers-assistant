import { useEffect, useState } from "react";
import { CheckCircle2, Coins, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

interface PurchaseSuccessPageProps {
  sessionId?: string;
  onContinue: () => void;
}

export function PurchaseSuccessPage({
  sessionId,
  onContinue,
}: PurchaseSuccessPageProps) {
  const { refreshCredits, credits } = useAuth();
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    // Refresh credits multiple times to catch the webhook update
    const refreshSequence = async () => {
      setRefreshing(true);

      // Immediate refresh
      await refreshCredits();

      // Delayed refreshes in case webhook is slow
      setTimeout(refreshCredits, 2000);
      setTimeout(refreshCredits, 5000);
      setTimeout(() => {
        refreshCredits();
        setRefreshing(false);
      }, 10000);
    };

    refreshSequence();
  }, [refreshCredits, sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your credits have been added to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Balance */}
          <div className="flex items-center justify-between px-4 py-3 bg-secondary rounded-lg">
            <span className="text-sm text-muted-foreground">Your Balance</span>
            <span className="font-semibold flex items-center gap-1.5">
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Coins className="h-4 w-4 text-amber-500" />
              )}
              {credits?.balance ?? "..."} credits
            </span>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            You can now generate worksheets and lesson plans using Premium AI.
          </p>

          <Button onClick={onContinue} className="w-full" size="lg">
            Continue to App
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

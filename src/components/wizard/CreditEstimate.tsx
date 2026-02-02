import { Coins, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { EstimateResponse } from "@/types";

interface CreditEstimateProps {
  estimate: EstimateResponse | null;
  isLoading: boolean;
  error: string | null;
  currentBalance: number;
  onConfirm: () => void;
  onBack: () => void;
}

export function CreditEstimate({
  estimate,
  isLoading,
  error,
  currentBalance,
  onConfirm,
  onBack,
}: CreditEstimateProps) {
  const hasEnoughCredits =
    estimate && currentBalance >= estimate.estimate.expectedCredits;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-3 text-muted-foreground">
              Calculating estimate...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <Button variant="outline" className="mt-4" onClick={onBack}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!estimate) {
    return null;
  }

  const { minCredits, maxCredits, expectedCredits, breakdown } = estimate.estimate;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5 text-primary" />
          Credit Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Text generation</span>
            <span>~{breakdown?.textGeneration ?? 3} credits</span>
          </div>
          {(breakdown?.imageGeneration ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Image generation</span>
              <span>~{breakdown?.imageGeneration} credits</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Estimated total</span>
            <span className="text-primary">
              {minCredits === maxCredits
                ? `${expectedCredits} credits`
                : `${minCredits}-${maxCredits} credits`}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-sm">Your balance</span>
          <span className="font-medium">{currentBalance} credits</span>
        </div>

        {hasEnoughCredits ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>You have enough credits to proceed</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span>
              You need at least {expectedCredits} credits. Please add more
              credits to continue.
            </span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{estimate.disclaimer}</p>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!hasEnoughCredits}
            className="flex-1"
          >
            Generate Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

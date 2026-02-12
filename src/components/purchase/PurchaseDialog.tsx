import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Coins, CreditCard, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getCreditPacks,
  createCheckoutSession,
  type CreditPack,
} from "@/services/checkout-api";
import { useToastStore } from "@/stores/toastStore";

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseDialog({ open, onOpenChange }: PurchaseDialogProps) {
  const { session, credits, refreshCredits } = useAuth();
  const { addToast } = useToastStore();
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && session?.access_token) {
      loadPacks();
    }
  }, [open, session?.access_token]);

  const loadPacks = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const creditPacks = await getCreditPacks(session.access_token);
      setPacks(creditPacks);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load credit packs"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pack: CreditPack) => {
    if (!session?.access_token) return;

    setPurchasing(pack.id);
    setError(null);

    try {
      const { url } = await createCheckoutSession(
        pack.id,
        session.access_token
      );

      if (url) {
        // Open Stripe Checkout in a new browser window
        window.open(url, "_blank");

        addToast({
          type: "info",
          title: "Checkout Started",
          message:
            "Complete your purchase in the new window. Your credits will be added automatically.",
        });

        // Close the dialog
        onOpenChange(false);

        // Poll for credits update (in case webhook is fast)
        setTimeout(() => refreshCredits(), 5000);
        setTimeout(() => refreshCredits(), 15000);
        setTimeout(() => refreshCredits(), 30000);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start checkout";
      setError(message);
      addToast({
        type: "error",
        title: "Checkout Failed",
        message,
      });
    } finally {
      setPurchasing(null);
    }
  };

  const getBestValueLabel = (pack: CreditPack, allPacks: CreditPack[]) => {
    const pricePerCredit = pack.priceCents / pack.credits;
    const lowestPrice = Math.min(
      ...allPacks.map((p) => p.priceCents / p.credits)
    );
    return pricePerCredit === lowestPrice && pack.credits > 100
      ? "Best Value"
      : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Buy Credits
          </DialogTitle>
          <DialogDescription>
            Purchase credits to generate worksheets and lesson plans with Premium AI.
          </DialogDescription>
        </DialogHeader>

        {/* Current Balance */}
        {credits && (
          <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 rounded-lg">
            <span className="text-sm text-muted-foreground">
              Current Balance
            </span>
            <span className="font-semibold flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-amber-500" />
              {credits.balance} credits
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPacks}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Credit Packs Grid */}
        {!loading && !error && packs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {packs.map((pack) => {
              const bestValue = getBestValueLabel(pack, packs);
              const isPurchasing = purchasing === pack.id;

              return (
                <Card
                  key={pack.id}
                  className={`relative transition-all hover:shadow-md ${
                    bestValue ? "border-amber-500/50 bg-amber-50/30" : ""
                  }`}
                >
                  {bestValue && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded-full">
                        <Sparkles className="h-3 w-3" />
                        {bestValue}
                      </span>
                    </div>
                  )}
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-lg">{pack.name}</CardTitle>
                    <CardDescription>
                      {pack.credits.toLocaleString()} credits
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold">{pack.priceDisplay}</div>
                    <p className="text-xs text-muted-foreground">
                      ${(pack.priceCents / pack.credits / 100).toFixed(3)} per
                      credit
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => handlePurchase(pack)}
                      disabled={!!purchasing}
                    >
                      {isPurchasing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Buy Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* No Packs Available */}
        {!loading && !error && packs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No credit packs available at this time.</p>
            <p className="text-sm mt-1">Please check back later.</p>
          </div>
        )}

        {/* Payment Methods Info */}
        <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
          <span>Secure checkout powered by Stripe</span>
          <span>•</span>
          <span>Cards, Google Pay, Apple Pay</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

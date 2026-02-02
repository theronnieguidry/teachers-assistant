import { XCircle, ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PurchaseCancelPageProps {
  onReturn: () => void;
}

export function PurchaseCancelPage({ onReturn }: PurchaseCancelPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <XCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
          <CardDescription>
            No worries! Your card was not charged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            You can always purchase credits later when you're ready to use
            Premium AI. In the meantime, Local AI is free to use.
          </p>

          <div className="flex flex-col gap-2">
            <Button onClick={onReturn} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to App
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="ghost"
              className="w-full"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

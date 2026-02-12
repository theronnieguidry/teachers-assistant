import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AiProvider } from "@/stores/settingsStore";

interface ProviderSelectorProps {
  value: AiProvider;
  onChange: (provider: AiProvider) => void;
  premiumDisabled?: boolean;
  premiumDisabledReason?: string;
}

interface ProviderOption {
  id: AiProvider;
  name: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
}

const providers: ProviderOption[] = [
  {
    id: "premium",
    name: "Premium AI",
    description: "Best quality - uses cloud-based AI",
    badge: "Best Quality",
    badgeVariant: "default",
  },
  {
    id: "local",
    name: "Local AI",
    description: "Runs on this computer - no image analysis",
    badge: "Free",
    badgeVariant: "secondary",
  },
];

export function ProviderSelector({
  value,
  onChange,
  premiumDisabled = false,
  premiumDisabledReason,
}: ProviderSelectorProps) {
  const handleProviderSelect = (providerId: AiProvider) => {
    if (providerId === "premium" && premiumDisabled) {
      return;
    }
    onChange(providerId);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {providers.map((provider) => {
          const isSelected = value === provider.id;
          const isDisabled = provider.id === "premium" && premiumDisabled;

          return (
            <Card
              key={provider.id}
              className={cn(
                "transition-all",
                isDisabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer hover:border-primary/50",
                isSelected && "border-primary ring-2 ring-primary/20"
              )}
              onClick={() => handleProviderSelect(provider.id)}
              role="button"
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
              aria-label={`Select ${provider.name} as AI provider`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{provider.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {provider.description}
                    </p>
                  </div>
                  {provider.badge && (
                    <Badge
                      variant={provider.badgeVariant}
                      className="shrink-0"
                    >
                      {provider.badge}
                    </Badge>
                  )}
                </div>
                {provider.id === "local" && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Model selection is managed automatically by the backend.
                    </p>
                  </div>
                )}
                {provider.id === "premium" && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Uses credits (typically 3-6 per worksheet)
                    </p>
                    {isDisabled && premiumDisabledReason && (
                      <p className="text-xs text-amber-700 mt-1">
                        {premiumDisabledReason}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

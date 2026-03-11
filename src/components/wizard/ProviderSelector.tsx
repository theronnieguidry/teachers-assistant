import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  checkOllamaStatus,
  getPreferredOllamaModel,
  type OllamaStatus,
} from "@/services/tauri-bridge";
import type { AiProvider } from "@/stores/settingsStore";

interface ProviderSelectorProps {
  value: AiProvider;
  onChange: (provider: AiProvider) => void;
  ollamaModel?: string | null;
  onOllamaModelChange?: (model: string | null) => void;
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
  ollamaModel,
  onOllamaModelChange,
  premiumDisabled = false,
}: ProviderSelectorProps) {
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [checkingOllama, setCheckingOllama] = useState(false);
  const [internalOllamaModel, setInternalOllamaModel] = useState<string | null>(
    ollamaModel ?? null
  );

  const resolvedOllamaModel = ollamaModel ?? internalOllamaModel;

  const handleOllamaModelChange = (model: string | null) => {
    setInternalOllamaModel(model);
    onOllamaModelChange?.(model);
  };

  useEffect(() => {
    setInternalOllamaModel(ollamaModel ?? null);
  }, [ollamaModel]);

  useEffect(() => {
    const checkOllama = async () => {
      setCheckingOllama(true);
      try {
        const status = await checkOllamaStatus();
        setOllamaStatus(status);
        if (value === "local" && !resolvedOllamaModel && status.models.length > 0) {
          handleOllamaModelChange(getPreferredOllamaModel(status.models));
        }
      } catch {
        setOllamaStatus({
          installed: false,
          running: false,
          version: null,
          models: [],
        });
      } finally {
        setCheckingOllama(false);
      }
    };

    checkOllama();
  }, [resolvedOllamaModel, value]);

  const isLocalAiAvailable = ollamaStatus?.running && ollamaStatus.models.length > 0;

  const handleProviderSelect = (providerId: AiProvider) => {
    if (providerId === "premium" && premiumDisabled) {
      return;
    }

    // Allow selecting Local AI even if not available (user might want to set it up)
    onChange(providerId);

    // Clear model if switching away from Local AI
    if (providerId !== "local") {
      handleOllamaModelChange(null);
    } else if (ollamaStatus?.models.length) {
      handleOllamaModelChange(getPreferredOllamaModel(ollamaStatus.models));
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {providers.map((provider) => {
          const isSelected = value === provider.id;
          const isLocalUnavailable = provider.id === "local" && !isLocalAiAvailable;
          const isPremiumUnavailable = provider.id === "premium" && premiumDisabled;

          return (
            <Card
              key={provider.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                isSelected && "border-primary ring-2 ring-primary/20",
                (isLocalUnavailable || isPremiumUnavailable) && "opacity-60",
                isPremiumUnavailable && "cursor-not-allowed hover:border-border"
              )}
              onClick={() => handleProviderSelect(provider.id)}
              role="button"
              aria-pressed={isSelected}
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
                    {checkingOllama ? (
                      <p className="text-xs text-muted-foreground">
                        Checking local AI status...
                      </p>
                    ) : isLocalAiAvailable ? (
                      <p className="text-xs text-green-600">
                        Ready ({ollamaStatus?.models.length} model{ollamaStatus?.models.length !== 1 ? 's' : ''} available)
                      </p>
                    ) : ollamaStatus?.running ? (
                      <p className="text-xs text-amber-600">
                        No models installed
                      </p>
                    ) : (
                      <p className="text-xs text-red-600">
                        Not running
                      </p>
                    )}
                  </div>
                )}
                {provider.id === "premium" && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Uses credits (typically 3-6 per worksheet)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {value === "local" && ollamaStatus?.running && ollamaStatus.models.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Local AI Model</label>
          <Select
            value={resolvedOllamaModel || ""}
            onValueChange={(val) => handleOllamaModelChange(val || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {ollamaStatus.models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {value === "local" && !isLocalAiAvailable && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {!ollamaStatus?.running
              ? "Local AI is not running. Start it from Settings or choose Premium AI."
              : "No models installed. Install a model from Settings or choose Premium AI."}
          </p>
        </div>
      )}
    </div>
  );
}

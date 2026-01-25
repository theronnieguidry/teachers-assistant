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
  type OllamaStatus,
} from "@/services/tauri-bridge";

type AiProvider = "claude" | "openai" | "ollama";

interface ProviderSelectorProps {
  value: AiProvider;
  onChange: (provider: AiProvider) => void;
  ollamaModel: string | null;
  onOllamaModelChange: (model: string | null) => void;
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
    id: "claude",
    name: "Claude",
    description: "Anthropic's AI - recommended for educational content",
    badge: "Recommended",
    badgeVariant: "default",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4 powered content generation",
  },
  {
    id: "ollama",
    name: "Ollama",
    description: "Run AI locally - no image analysis",
    badge: "Free",
    badgeVariant: "secondary",
  },
];

export function ProviderSelector({
  value,
  onChange,
  ollamaModel,
  onOllamaModelChange,
}: ProviderSelectorProps) {
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [checkingOllama, setCheckingOllama] = useState(false);

  useEffect(() => {
    const checkOllama = async () => {
      setCheckingOllama(true);
      try {
        const status = await checkOllamaStatus();
        setOllamaStatus(status);
        // If Ollama is selected but no model is set, and models are available, select the first one
        if (value === "ollama" && !ollamaModel && status.models.length > 0) {
          onOllamaModelChange(status.models[0]);
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
  }, [value, ollamaModel, onOllamaModelChange]);

  const isOllamaAvailable = ollamaStatus?.running && ollamaStatus.models.length > 0;

  const handleProviderSelect = (providerId: AiProvider) => {
    // Allow selecting Ollama even if not available (user might want to set it up)
    onChange(providerId);

    // Clear Ollama model if switching away from Ollama
    if (providerId !== "ollama") {
      onOllamaModelChange(null);
    } else if (ollamaStatus?.models.length) {
      // Auto-select first model when switching to Ollama
      onOllamaModelChange(ollamaStatus.models[0]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {providers.map((provider) => {
          const isSelected = value === provider.id;
          const isOllamaUnavailable = provider.id === "ollama" && !isOllamaAvailable;

          return (
            <Card
              key={provider.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                isSelected && "border-primary ring-2 ring-primary/20",
                isOllamaUnavailable && "opacity-60"
              )}
              onClick={() => handleProviderSelect(provider.id)}
              role="button"
              aria-pressed={isSelected}
              aria-label={`Select ${provider.name} as AI provider`}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{provider.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {provider.description}
                    </p>
                  </div>
                  {provider.badge && (
                    <Badge
                      variant={provider.badgeVariant}
                      className="shrink-0 text-xs"
                    >
                      {provider.badge}
                    </Badge>
                  )}
                </div>
                {provider.id === "ollama" && (
                  <div className="mt-2">
                    {checkingOllama ? (
                      <p className="text-xs text-muted-foreground">
                        Checking...
                      </p>
                    ) : isOllamaAvailable ? (
                      <p className="text-xs text-green-600">
                        Running ({ollamaStatus?.models.length} models)
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {value === "ollama" && ollamaStatus?.running && ollamaStatus.models.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Ollama Model</label>
          <Select
            value={ollamaModel || ""}
            onValueChange={(val) => onOllamaModelChange(val || null)}
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

      {value === "ollama" && !isOllamaAvailable && (
        <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-lg">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {!ollamaStatus?.running
              ? "Ollama is not running. Start Ollama or choose a different provider."
              : "No models installed. Install a model in Ollama settings or choose a different provider."}
          </p>
        </div>
      )}
    </div>
  );
}

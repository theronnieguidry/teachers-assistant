import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  isHostedApiBaseUrl,
  type ApiEndpointPreset,
  useSettingsStore,
} from "@/stores/settingsStore";

interface EndpointSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_LABELS: Record<ApiEndpointPreset, string> = {
  local: "Local Dev",
  staging: "Staging",
  production: "Production",
  custom: "Custom",
};

export function EndpointSettingsDialog({
  open,
  onOpenChange,
}: EndpointSettingsDialogProps) {
  const apiEndpointPreset = useSettingsStore((state) => state.apiEndpointPreset);
  const customApiEndpoint = useSettingsStore((state) => state.customApiEndpoint);
  const setApiEndpointPreset = useSettingsStore((state) => state.setApiEndpointPreset);
  const setCustomApiEndpoint = useSettingsStore((state) => state.setCustomApiEndpoint);
  const resolvedApiBaseUrl = useSettingsStore((state) => state.getResolvedApiBaseUrl());

  const hosted = isHostedApiBaseUrl(resolvedApiBaseUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Generation API Endpoint</DialogTitle>
          <DialogDescription>
            Choose which backend environment this desktop app calls at runtime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-endpoint-preset">Endpoint Preset</Label>
            <Select
              value={apiEndpointPreset}
              onValueChange={(value) => setApiEndpointPreset(value as ApiEndpointPreset)}
            >
              <SelectTrigger id="api-endpoint-preset" aria-label="Endpoint preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">{PRESET_LABELS.local}</SelectItem>
                <SelectItem value="staging">{PRESET_LABELS.staging}</SelectItem>
                <SelectItem value="production">{PRESET_LABELS.production}</SelectItem>
                <SelectItem value="custom">{PRESET_LABELS.custom}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {apiEndpointPreset === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-endpoint">Custom API Base URL</Label>
              <Input
                id="custom-endpoint"
                value={customApiEndpoint}
                onChange={(event) => setCustomApiEndpoint(event.target.value)}
                placeholder="https://api.example.com"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          )}

          <div className="rounded-md border bg-muted/30 p-3 space-y-2" data-testid="endpoint-diagnostics">
            <p className="text-sm font-medium">Diagnostics</p>
            <p className="text-xs text-muted-foreground">
              Active preset: <span className="font-medium text-foreground">{PRESET_LABELS[apiEndpointPreset]}</span>
            </p>
            <p className="text-xs text-muted-foreground break-all">
              Base URL: <span className="font-medium text-foreground">{resolvedApiBaseUrl}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Endpoint type: <span className="font-medium text-foreground">{hosted ? "Hosted (HTTPS)" : "Local/Unhosted"}</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

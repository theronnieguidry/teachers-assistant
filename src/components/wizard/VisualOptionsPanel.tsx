import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, Palette, Sparkles } from "lucide-react";
import type { VisualSettings, VisualRichness, VisualStyle } from "@/types";

interface VisualOptionsPanelProps {
  settings: VisualSettings;
  onChange: (settings: Partial<VisualSettings>) => void;
  disabled?: boolean;
}

const RICHNESS_OPTIONS: { value: VisualRichness; label: string; description: string }[] = [
  {
    value: "minimal",
    label: "Minimal (1-2 images)",
    description: "A header illustration and 1-2 question images",
  },
  {
    value: "standard",
    label: "Standard (3-5 images)",
    description: "Balanced mix of illustrations throughout",
  },
  {
    value: "rich",
    label: "Rich (image per question)",
    description: "Image for each question when helpful",
  },
];

const STYLE_OPTIONS: { value: VisualStyle; label: string; description: string }[] = [
  {
    value: "friendly_cartoon",
    label: "Friendly cartoon",
    description: "Colorful, child-friendly illustrations",
  },
  {
    value: "simple_icons",
    label: "Simple icons",
    description: "Clean, minimal line icons",
  },
  {
    value: "black_white",
    label: "Black & white",
    description: "Printer-friendly line art",
  },
];

export function VisualOptionsPanel({
  settings,
  onChange,
  disabled = false,
}: VisualOptionsPanelProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="include-visuals" className="text-sm font-medium">
              Include AI-generated images
            </Label>
          </div>
          <Switch
            id="include-visuals"
            checked={settings.includeVisuals}
            onCheckedChange={(checked) => onChange({ includeVisuals: checked })}
            disabled={disabled}
          />
        </div>

        {settings.includeVisuals && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Visual richness</Label>
              </div>
              <Select
                value={settings.richness}
                onValueChange={(value: VisualRichness) =>
                  onChange({ richness: value })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select richness" />
                </SelectTrigger>
                <SelectContent>
                  {RICHNESS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Visual style</Label>
              </div>
              <Select
                value={settings.style}
                onValueChange={(value: VisualStyle) => onChange({ style: value })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Premium AI generates relevant images based on your worksheet content.
          Images are embedded directly in the HTML for easy printing.
        </p>
      </CardContent>
    </Card>
  );
}

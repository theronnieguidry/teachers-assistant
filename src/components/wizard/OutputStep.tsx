import { useState } from "react";
import { Folder, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWizardStore } from "@/stores/wizardStore";
import { ProviderSelector } from "./ProviderSelector";

export function OutputStep() {
  const {
    outputPath,
    setOutputPath,
    nextStep,
    prevStep,
    title,
    aiProvider,
    setAiProvider,
    ollamaModel,
    setOllamaModel,
  } = useWizardStore();
  const [customPath, setCustomPath] = useState(outputPath || "");

  const handleSelectFolder = async () => {
    try {
      // In real app, this would use Tauri's dialog API
      // For now, we'll use a prompt
      const path = prompt(
        "Enter output folder path:",
        customPath || `C:\\Documents\\TeacherPacks\\${title.replace(/[^a-zA-Z0-9]/g, "_")}`
      );
      if (path) {
        setCustomPath(path);
        setOutputPath(path);
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    }
  };

  const handleContinue = () => {
    if (!outputPath && customPath) {
      setOutputPath(customPath);
    }
    nextStep();
  };

  // Disable generate if Ollama is selected but no model is chosen
  const canGenerate =
    customPath &&
    (aiProvider !== "ollama" || (aiProvider === "ollama" && ollamaModel));

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>AI Provider</Label>
        <ProviderSelector
          value={aiProvider}
          onChange={setAiProvider}
          ollamaModel={ollamaModel}
          onOllamaModelChange={setOllamaModel}
        />
      </div>

      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground mb-3">
          Choose where to save your generated materials.
        </p>

        <div className="space-y-2">
          <Label>Output Folder</Label>
          <div className="flex gap-2">
            <Input
              value={customPath}
              onChange={(e) => {
                setCustomPath(e.target.value);
                setOutputPath(e.target.value);
              }}
              placeholder="Select or enter a folder path..."
              className="flex-1"
            />
            <Button variant="outline" onClick={handleSelectFolder}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Browse
            </Button>
          </div>
        </div>
      </div>

      {customPath && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Files will be saved to:</span>
          </div>
          <p className="text-sm font-mono mt-1 break-all">{customPath}</p>
        </div>
      )}

      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Generated files:</strong>
        </p>
        <ul className="text-sm text-blue-600 dark:text-blue-400 mt-1 space-y-0.5">
          <li>• worksheet.html / worksheet.pdf</li>
          <li>• lesson_plan.html / lesson_plan.pdf</li>
          <li>• answer_key.html / answer_key.pdf</li>
        </ul>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!canGenerate}>
          Generate
        </Button>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Folder, FolderOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWizardStore } from "@/stores/wizardStore";
import { useUnifiedProjectStore } from "@/stores/unifiedProjectStore";
import { selectFolder, isTauriContext } from "@/services/tauri-bridge";

export function OutputStep() {
  const {
    outputPath,
    setOutputPath,
    nextStep,
    prevStep,
    title,
    targetProjectId,
    setTargetProjectId,
  } = useWizardStore();
  const { projects, loadProjects } = useUnifiedProjectStore();
  const [customPath, setCustomPath] = useState(outputPath || "");

  // Load unified projects for the selector
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSelectFolder = async () => {
    try {
      if (isTauriContext()) {
        // Use Tauri's native folder picker
        const path = await selectFolder();
        if (path) {
          setCustomPath(path);
          setOutputPath(path);
        }
      } else {
        // Browser dev mode fallback - prompt with better message
        const path = prompt(
          "Enter output folder path (dev mode - Tauri folder picker unavailable):",
          customPath || ""
        );
        if (path) {
          setCustomPath(path);
          setOutputPath(path);
        }
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose a project and where to save your generated materials.
      </p>

      {/* Project Selection */}
      <div className="space-y-2">
        <Label>Save to Project</Label>
        <Select
          value={targetProjectId || "new"}
          onValueChange={(v) => setTargetProjectId(v === "new" ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="New Quick Create Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New Quick Create Project</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.projectId} value={project.projectId}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Generated materials will be linked to this project in your Library.
        </p>
      </div>

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
          <strong>Files saved to folder:</strong>
        </p>
        <ul className="text-sm text-blue-600 dark:text-blue-400 mt-1 space-y-0.5">
          <li>• {title || "Project"} - Worksheet.html</li>
          <li>• {title || "Project"} - Lesson Plan.html</li>
          <li>• {title || "Project"} - Answer Key.html</li>
        </ul>
        <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
          PDFs can be downloaded from the Preview after generation.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!customPath}>
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

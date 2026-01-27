import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWizardStore } from "@/stores/wizardStore";
import { useUnifiedProjectStore } from "@/stores/unifiedProjectStore";
import { useDesignPackStore } from "@/stores/designPackStore";
import { FolderPlus, FolderOpen, Package } from "lucide-react";
import type { ProjectType } from "@/types";

export function ProjectSelectionStep() {
  const {
    selectedProjectId,
    selectedProjectType,
    createNewProject,
    newProjectName,
    selectedDesignPackId,
    setSelectedProject,
    setSelectedProjectType,
    setCreateNewProject,
    setNewProjectName,
    setSelectedDesignPack,
    nextStep,
    title,
  } = useWizardStore();

  const { projects, loadProjects, isLoading: projectsLoading } = useUnifiedProjectStore();
  const { packs, loadPacks, isLoading: packsLoading } = useDesignPackStore();

  // Load projects and design packs on mount
  useEffect(() => {
    loadProjects();
    loadPacks();
  }, [loadProjects, loadPacks]);

  // Initialize new project name from wizard title if empty
  useEffect(() => {
    if (createNewProject && !newProjectName && title) {
      setNewProjectName(title);
    }
  }, [createNewProject, newProjectName, title, setNewProjectName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: either select existing project or provide new project name
    if (!createNewProject && !selectedProjectId) {
      return; // Show error - must select a project
    }
    if (createNewProject && !newProjectName.trim()) {
      return; // Show error - must provide a name
    }

    nextStep();
  };

  const filteredProjects = projects.filter(
    (p) => selectedProjectType === "quick_create" || p.type === selectedProjectType
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Type Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Project Type</Label>
        <RadioGroup
          value={selectedProjectType}
          onValueChange={(value) => setSelectedProjectType(value as ProjectType)}
          className="grid grid-cols-2 gap-4"
        >
          <Label
            htmlFor="quick_create"
            className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
          >
            <RadioGroupItem value="quick_create" id="quick_create" className="sr-only" />
            <FolderPlus className="mb-2 h-6 w-6" />
            <span className="text-sm font-medium">Quick Create</span>
            <span className="text-xs text-muted-foreground text-center mt-1">
              One-off worksheet or lesson
            </span>
          </Label>
          <Label
            htmlFor="learning_path"
            className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
          >
            <RadioGroupItem value="learning_path" id="learning_path" className="sr-only" />
            <FolderOpen className="mb-2 h-6 w-6" />
            <span className="text-sm font-medium">Learning Path</span>
            <span className="text-xs text-muted-foreground text-center mt-1">
              Linked to mastery tracker
            </span>
          </Label>
        </RadioGroup>
      </div>

      {/* New or Existing Project */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Add to Project</Label>
        <RadioGroup
          value={createNewProject ? "new" : "existing"}
          onValueChange={(value) => setCreateNewProject(value === "new")}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="new" id="new-project" />
            <Label htmlFor="new-project" className="font-normal cursor-pointer">
              Create new project
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="existing" id="existing-project" />
            <Label htmlFor="existing-project" className="font-normal cursor-pointer">
              Add to existing project
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Conditional: New Project Name or Project Selector */}
      {createNewProject ? (
        <div className="space-y-2">
          <Label htmlFor="projectName">Project Name</Label>
          <Input
            id="projectName"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Enter project name..."
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Select Project</Label>
          <Select
            value={selectedProjectId || ""}
            onValueChange={(value) => setSelectedProject(value || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder={projectsLoading ? "Loading..." : "Select a project"} />
            </SelectTrigger>
            <SelectContent>
              {filteredProjects.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No projects found. Create a new one above.
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <SelectItem key={project.projectId} value={project.projectId}>
                    <div className="flex items-center gap-2">
                      <span>{project.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({project.artifactIds.length} artifacts)
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Optional: Design Pack Selection */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Design Pack (Optional)</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Apply a consistent design style to your materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedDesignPackId || "none"}
            onValueChange={(value) => setSelectedDesignPack(value === "none" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={packsLoading ? "Loading..." : "None"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No design pack</SelectItem>
              {packs.map((pack) => (
                <SelectItem key={pack.packId} value={pack.packId}>
                  <div className="flex items-center gap-2">
                    <span>{pack.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({pack.items.length} items)
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={!createNewProject && !selectedProjectId}>
          Next
        </Button>
      </div>
    </form>
  );
}

import { useEffect, useState } from "react";
import {
  FolderOpen,
  RefreshCw,
  Copy,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/projectStore";
import { useWizardStore } from "@/stores/wizardStore";
import { openFolder, isTauriContext } from "@/services/tauri-bridge";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils";

export function ProjectsPanel() {
  const {
    projects,
    currentProject,
    isLoading,
    fetchProjects,
    setCurrentProject,
    deleteProject,
    createProject,
  } = useProjectStore();
  const { openWizardForRegeneration } = useWizardStore();
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  const selectedCount = selectedProjectIds.size;

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedProjectIds(new Set());
  };

  const selectAllProjects = () => {
    setSelectedProjectIds(new Set(projects.map((project) => project.id)));
  };

  const handleOpenFolder = async (outputPath: string | null) => {
    if (!outputPath) {
      toast.info("No output folder", "This project doesn't have an output folder set.");
      return;
    }
    try {
      if (isTauriContext()) {
        await openFolder(outputPath);
      } else {
        toast.info("Desktop only", "Opening folders is only available in the desktop app.");
      }
    } catch (error) {
      console.error("Failed to open folder:", error);
      toast.error("Failed to open folder", error instanceof Error ? error.message : "Unknown error");
    }
  };

  const handleDuplicate = async (project: typeof projects[0]) => {
    try {
      const duplicatedProject = await createProject({
        title: `${project.title} (Copy)`,
        prompt: project.prompt,
        grade: project.grade,
        subject: project.subject,
        options: project.options as Record<string, unknown>,
        inspiration: project.inspiration,
        outputPath: project.outputPath || undefined,
      });
      setCurrentProject(duplicatedProject);
      toast.success("Project duplicated", `Created "${duplicatedProject.title}"`);
    } catch (error) {
      console.error("Failed to duplicate project:", error);
      toast.error("Failed to duplicate", error instanceof Error ? error.message : "Unknown error");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Remove stale selections when project list changes
  useEffect(() => {
    setSelectedProjectIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(projects.map((project) => project.id));
      const filtered = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      return filtered.size === prev.size ? prev : filtered;
    });
  }, [projects]);

  const handleBatchDelete = async () => {
    if (selectedCount === 0) return;
    const confirmed = confirm(`Delete ${selectedCount} selected project${selectedCount === 1 ? "" : "s"}?`);
    if (!confirmed) return;

    try {
      await Promise.all(Array.from(selectedProjectIds).map((projectId) => deleteProject(projectId)));
      toast.success("Projects deleted", `Removed ${selectedCount} project${selectedCount === 1 ? "" : "s"}.`);
      clearSelection();
    } catch (error) {
      console.error("Failed to delete selected projects:", error);
      toast.error(
        "Failed to delete projects",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  const handleBatchOpenFolders = async () => {
    if (selectedCount === 0) return;

    const selectedProjects = projects.filter((project) => selectedProjectIds.has(project.id));
    const outputPaths = Array.from(
      new Set(
        selectedProjects
          .map((project) => project.outputPath)
          .filter((path): path is string => !!path)
      )
    );

    if (outputPaths.length === 0) {
      toast.info("No output folders", "The selected projects do not have output folders set.");
      return;
    }

    if (!isTauriContext()) {
      toast.info("Desktop only", "Opening folders is only available in the desktop app.");
      return;
    }

    try {
      for (const outputPath of outputPaths) {
        await openFolder(outputPath);
      }
      toast.success(
        "Folders opened",
        `Opened ${outputPaths.length} folder${outputPaths.length === 1 ? "" : "s"} for selected projects.`
      );
    } catch (error) {
      console.error("Failed to open selected folders:", error);
      toast.error(
        "Failed to open folders",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "generating":
        return "bg-blue-500 animate-pulse";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Projects</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => fetchProjects()}
          disabled={isLoading}
          title="Refresh projects"
          aria-label="Refresh projects"
        >
          <RefreshCw
            className={cn("h-4 w-4", isLoading && "animate-spin")}
          />
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-2">
        {projects.length > 0 && (
          <div className="flex items-center gap-1 px-1 pb-2">
            <Button variant="outline" size="sm" onClick={selectAllProjects}>
              Select all
            </Button>
            {selectedCount > 0 && (
              <>
                <span className="text-xs text-muted-foreground px-1">
                  {selectedCount} selected
                </span>
                <Button variant="outline" size="sm" onClick={handleBatchOpenFolders}>
                  Open folders
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                  Delete selected
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </>
            )}
          </div>
        )}

        {isLoading && projects.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 px-4">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No projects yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Create your first teaching material above
            </p>
          </div>
        ) : (
          <div className="space-y-1 pb-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "group p-3 rounded-lg cursor-pointer transition-colors",
                  selectedProjectIds.has(project.id) && "ring-1 ring-primary/60 bg-primary/5",
                  currentProject?.id === project.id
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                )}
                onClick={() => {
                  if (selectedCount > 0) {
                    toggleProjectSelection(project.id);
                    return;
                  }
                  setCurrentProject(project);
                }}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-muted-foreground/40"
                    aria-label={`Select ${project.title}`}
                    checked={selectedProjectIds.has(project.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleProjectSelection(project.id)}
                  />
                  <div
                    className={cn(
                      "w-2 h-2 mt-1.5 rounded-full flex-shrink-0",
                      getStatusColor(project.status)
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">
                      {project.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Grade {project.grade} • {project.subject}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {formatDate(project.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Actions - show on hover */}
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Open folder"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFolder(project.outputPath);
                    }}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Regenerate"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await openWizardForRegeneration(project);
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Duplicate"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(project);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this project?")) {
                        deleteProject(project.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect } from "react";
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
import { cn } from "@/lib/utils";

export function ProjectsPanel() {
  const {
    projects,
    currentProject,
    isLoading,
    fetchProjects,
    setCurrentProject,
    deleteProject,
  } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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
        >
          <RefreshCw
            className={cn("h-4 w-4", isLoading && "animate-spin")}
          />
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-2">
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
                  currentProject?.id === project.id
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                )}
                onClick={() => setCurrentProject(project)}
              >
                <div className="flex items-start gap-2">
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
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Regenerate"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Duplicate"
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

import { useEffect, useState } from "react";
import {
  FileText,
  BookOpen,
  CheckSquare,
  FolderOpen,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PreviewTabs } from "./PreviewTabs";
import { useProjectStore } from "@/stores/projectStore";
import { openFolder } from "@/services/tauri-bridge";
import type { Project } from "@/types";

interface ProjectPreviewProps {
  project: Project;
  onRegenerate?: () => void;
}

export function ProjectPreview({ project, onRegenerate }: ProjectPreviewProps) {
  const { fetchProjectVersion } = useProjectStore();
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    // Load version data if project is completed and no version loaded
    if (project.status === "completed" && !project.latestVersion) {
      loadVersion();
    }
  }, [project.id, project.status]);

  const loadVersion = async () => {
    setIsLoadingVersion(true);
    try {
      await fetchProjectVersion(project.id);
    } finally {
      setIsLoadingVersion(false);
    }
  };

  const getStatusBadge = () => {
    switch (project.status) {
      case "completed":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            Completed
          </span>
        );
      case "generating":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 animate-pulse">
            Generating...
          </span>
        );
      case "failed":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Pending
          </span>
        );
    }
  };

  const handleOpenFolder = async () => {
    if (project.outputPath) {
      try {
        await openFolder(project.outputPath);
      } catch (error) {
        console.error("Failed to open folder:", error);
      }
    }
  };

  // Show full preview mode
  if (showPreview && project.latestVersion) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{project.title}</h2>
            <p className="text-sm text-muted-foreground">
              Grade {project.grade} • {project.subject}
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            Back to Details
          </Button>
        </div>
        <div className="flex-1">
          <PreviewTabs
            worksheetHtml={project.latestVersion.worksheetHtml || ""}
            lessonPlanHtml={project.latestVersion.lessonPlanHtml || ""}
            answerKeyHtml={project.latestVersion.answerKeyHtml || ""}
            projectTitle={project.title}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground mt-1">
            Grade {project.grade} • {project.subject}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Prompt */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Original Prompt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{project.prompt}</p>
        </CardContent>
      </Card>

      {/* Output files */}
      {project.status === "completed" && (
        <>
          {isLoadingVersion ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : project.latestVersion ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <OutputCard
                  icon={FileText}
                  title="Worksheet"
                  description="Student practice exercises"
                  hasContent={!!project.latestVersion.worksheetHtml}
                />
                <OutputCard
                  icon={BookOpen}
                  title="Lesson Plan"
                  description="Teaching guide for educators"
                  hasContent={!!project.latestVersion.lessonPlanHtml}
                />
                <OutputCard
                  icon={CheckSquare}
                  title="Answer Key"
                  description="Complete solutions"
                  hasContent={!!project.latestVersion.answerKeyHtml}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setShowPreview(true)} className="flex-1">
                  View & Print Materials
                </Button>
                {project.outputPath && (
                  <Button variant="outline" onClick={handleOpenFolder}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Open Folder
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground">
                  No generated content found.
                </p>
                <Button variant="outline" className="mt-4" onClick={loadVersion}>
                  Refresh
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {project.status === "generating" && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-pulse">
              <div className="h-8 w-8 mx-auto mb-4 rounded-full bg-primary/20" />
              <p className="text-muted-foreground">
                Your materials are being generated...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {project.status === "failed" && (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <p className="text-destructive text-center">
              {project.errorMessage || "Generation failed. Please try again."}
            </p>
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={onRegenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Generation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {project.status === "pending" && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              This project is waiting to be generated.
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={onRegenerate}>Start Generation</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>Created: {project.createdAt.toLocaleDateString()}</p>
        {project.completedAt && (
          <p>Completed: {project.completedAt.toLocaleDateString()}</p>
        )}
        {project.creditsUsed > 0 && <p>Credits used: {project.creditsUsed}</p>}
        {project.latestVersion?.aiProvider && (
          <p>AI Provider: {project.latestVersion.aiProvider}</p>
        )}
      </div>
    </div>
  );
}

interface OutputCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  hasContent: boolean;
}

function OutputCard({
  icon: Icon,
  title,
  description,
  hasContent,
}: OutputCardProps) {
  return (
    <Card
      className={`transition-shadow ${hasContent ? "hover:shadow-md" : "opacity-60"}`}
    >
      <CardHeader className="pb-2">
        <Icon className={`h-8 w-8 mb-2 ${hasContent ? "text-primary" : "text-muted-foreground"}`} />
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <span
          className={`text-xs ${hasContent ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
        >
          {hasContent ? "✓ Generated" : "Not included"}
        </span>
      </CardContent>
    </Card>
  );
}

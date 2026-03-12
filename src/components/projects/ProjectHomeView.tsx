import { useEffect, useMemo } from "react";
import { BookOpen, Brush, Clock3, MapPinned, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectPreview } from "@/components/preview/ProjectPreview";
import { useArtifactStore } from "@/stores/artifactStore";
import { useDesignPackStore } from "@/stores/designPackStore";
import { useWizardStore } from "@/stores/wizardStore";
import { getObjectiveById } from "@/lib/curriculum";
import { getProjectTypeLabel, type ProjectWithContext } from "@/types";

interface ProjectHomeViewProps {
  project: ProjectWithContext;
}

export function ProjectHomeView({ project }: ProjectHomeViewProps) {
  const artifacts = useArtifactStore((state) => state.artifacts);
  const loadArtifacts = useArtifactStore((state) => state.loadArtifacts);
  const packs = useDesignPackStore((state) => state.packs);
  const { openWizardForProject, openWizardForRegeneration } = useWizardStore();

  useEffect(() => {
    void loadArtifacts();
  }, [loadArtifacts]);

  const recentArtifacts = useMemo(() => {
    return artifacts
      .filter((artifact) => artifact.projectId === project.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 4);
  }, [artifacts, project.id]);

  const linkedObjectives = useMemo(() => {
    return project.linkedObjectiveIds
      .map((objectiveId) => ({
        objectiveId,
        info: getObjectiveById(objectiveId),
      }))
      .filter((entry) => entry.info);
  }, [project.linkedObjectiveIds]);

  const defaultPack = project.defaultDesignPackId
    ? packs.find((pack) => pack.packId === project.defaultDesignPackId) || null
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <Badge variant="secondary">{getProjectTypeLabel(project.type)}</Badge>
          </div>
          <p className="text-muted-foreground">
            Grade {project.grade} • {project.subject}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openWizardForProject(project)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Create Something
          </Button>
          <Button variant="outline" onClick={() => void openWizardForRegeneration(project)}>
            <Clock3 className="mr-2 h-4 w-4" />
            Regenerate Last Request
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Materials</CardTitle>
            <CardDescription>Artifacts saved for this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-semibold">{recentArtifacts.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Default Design Pack</CardTitle>
            <CardDescription>Auto-applied in the wizard for this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Brush className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {defaultPack?.name || "None selected"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Linked Objectives</CardTitle>
            <CardDescription>Learning path context attached to this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedObjectives.length > 0 ? (
              linkedObjectives.slice(0, 2).map(({ objectiveId, info }) => (
                <div key={objectiveId} className="text-sm">
                  <p className="font-medium">{info?.objective.text || objectiveId}</p>
                  <p className="text-xs text-muted-foreground">
                    {info?.subject || project.subject}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No linked objectives yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Learning Path Status</CardTitle>
            <CardDescription>Context carried with the canonical project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPinned className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {project.type === "learning_path"
                  ? project.learnerId
                    ? `Learner ${project.learnerId}`
                    : "Learning path project"
                  : "Quick create project"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Materials</CardTitle>
          <CardDescription>
            The latest saved library items attached to this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentArtifacts.length > 0 ? (
            <div className="space-y-3">
              {recentArtifacts.map((artifact) => (
                <div
                  key={artifact.artifactId}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{artifact.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {artifact.subject} • {new Date(artifact.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">{artifact.type.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No local library materials have been saved for this project yet.
            </p>
          )}
        </CardContent>
      </Card>

      <ProjectPreview
        project={project}
        onRegenerate={() => void openWizardForRegeneration(project)}
      />
    </div>
  );
}

import { useState } from "react";
import { FileText, BookOpen, CheckSquare, ClipboardList, Eye, Printer, Trash2, Tag, X, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { LocalArtifact, ArtifactType, Grade } from "@/types";
import { getArtifactTypeLabel } from "@/types";

interface ArtifactCardProps {
  artifact: Omit<LocalArtifact, "htmlContent">;
  onView: (artifactId: string) => void;
  onPrint: (artifactId: string) => void;
  onDelete: (artifactId: string) => void;
  onEditTags?: (artifactId: string, tags: string[]) => void;
}

const ARTIFACT_ICONS: Record<ArtifactType, typeof FileText> = {
  student_page: FileText,
  teacher_script: BookOpen,
  answer_key: CheckSquare,
  lesson_plan: ClipboardList,
  print_pack: FileText,
};

const GRADE_COLORS: Record<Grade, string> = {
  K: "bg-purple-100 text-purple-800",
  "1": "bg-blue-100 text-blue-800",
  "2": "bg-green-100 text-green-800",
  "3": "bg-yellow-100 text-yellow-800",
  "4": "bg-orange-100 text-orange-800",
  "5": "bg-red-100 text-red-800",
  "6": "bg-pink-100 text-pink-800",
};

export function ArtifactCard({ artifact, onView, onPrint, onDelete, onEditTags }: ArtifactCardProps) {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [editedTags, setEditedTags] = useState<string[]>(artifact.objectiveTags);

  const Icon = ARTIFACT_ICONS[artifact.type] || FileText;
  const gradeColor = GRADE_COLORS[artifact.grade] || "bg-gray-100 text-gray-800";

  const formattedDate = new Date(artifact.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !editedTags.includes(trimmed)) {
      setEditedTags([...editedTags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditedTags(editedTags.filter((t) => t !== tag));
  };

  const handleSaveTags = () => {
    onEditTags?.(artifact.artifactId, editedTags);
    setIsEditingTags(false);
  };

  const handleCancelEdit = () => {
    setEditedTags(artifact.objectiveTags);
    setTagInput("");
    setIsEditingTags(false);
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium line-clamp-2">
                {artifact.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(artifact.artifactId)}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPrint(artifact.artifactId)}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
              {onEditTags && (
                <DropdownMenuItem onClick={() => setIsEditingTags(true)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Edit Tags
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(artifact.artifactId)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={gradeColor}>
            Grade {artifact.grade}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {artifact.subject}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {getArtifactTypeLabel(artifact.type)}
          </Badge>
        </div>

        {isEditingTags ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-1">
              {editedTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs font-mono gap-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                placeholder="Add tag..."
                className="h-7 text-xs"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleAddTag}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="text-xs h-6" onClick={handleCancelEdit}>Cancel</Button>
              <Button size="sm" className="text-xs h-6" onClick={handleSaveTags}>Save</Button>
            </div>
          </div>
        ) : artifact.objectiveTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {artifact.objectiveTags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-mono">
                {tag}
              </Badge>
            ))}
            {artifact.objectiveTags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{artifact.objectiveTags.length - 2} more
              </Badge>
            )}
          </div>
        ) : null}

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3"
          onClick={() => onView(artifact.artifactId)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      </CardContent>
    </Card>
  );
}

// Compact list variant
export function ArtifactListItem({ artifact, onView, onPrint, onDelete }: ArtifactCardProps) {
  const Icon = ARTIFACT_ICONS[artifact.type] || FileText;
  const gradeColor = GRADE_COLORS[artifact.grade] || "bg-gray-100 text-gray-800";

  const formattedDate = new Date(artifact.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{artifact.title}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{artifact.subject}</span>
          <span>•</span>
          <span>{formattedDate}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`${gradeColor} text-xs`}>
          {artifact.grade}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {getArtifactTypeLabel(artifact.type)}
        </Badge>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(artifact.artifactId)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPrint(artifact.artifactId)}>
          <Printer className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(artifact.artifactId)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

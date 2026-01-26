import { Progress } from "@/components/ui/progress";
import type { SubjectProgress as SubjectProgressType } from "@/types";
import { BookOpen, Calculator, PenTool, Microscope, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubjectProgressProps {
  progress: SubjectProgressType;
  compact?: boolean;
  onClick?: () => void;
}

const subjectIcons: Record<string, typeof BookOpen> = {
  Math: Calculator,
  Reading: BookOpen,
  Writing: PenTool,
  Science: Microscope,
  "Social Studies": Globe,
};

const subjectColors: Record<string, string> = {
  Math: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  Reading: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  Writing: "text-pink-600 bg-pink-100 dark:bg-pink-900/30",
  Science: "text-green-600 bg-green-100 dark:bg-green-900/30",
  "Social Studies": "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
};

export function SubjectProgressCard({
  progress,
  compact = false,
  onClick,
}: SubjectProgressProps) {
  const Icon = subjectIcons[progress.subject] || BookOpen;
  const colorClass = subjectColors[progress.subject] || "text-primary bg-primary/10";

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors w-full text-left",
          onClick && "cursor-pointer"
        )}
      >
        <div className={cn("p-1.5 rounded", colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{progress.subject}</div>
          <Progress value={progress.percentComplete} className="h-1.5 mt-1" />
        </div>
        <div className="text-xs text-muted-foreground">
          {progress.mastered}/{progress.totalObjectives}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left w-full",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{progress.subject}</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            {progress.mastered} of {progress.totalObjectives} skills mastered
          </div>
          <Progress value={progress.percentComplete} className="h-2 mt-2" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
        {progress.inProgress > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {progress.inProgress} in progress
          </span>
        )}
        {progress.needsReview > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            {progress.needsReview} need review
          </span>
        )}
      </div>
    </button>
  );
}

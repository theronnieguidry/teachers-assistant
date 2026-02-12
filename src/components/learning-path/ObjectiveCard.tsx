import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MasteryBadge } from "./MasteryBadge";
import type {
  CurriculumObjective,
  CurriculumUnit,
  MasteryState,
} from "@/types";
import { useWizardStore } from "@/stores/wizardStore";
import { useLearnerStore } from "@/stores/learnerStore";
import { Play, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ObjectiveCardProps {
  objective: CurriculumObjective;
  unit: CurriculumUnit;
  subject: string;
  masteryState: MasteryState;
  highlighted?: boolean;
  compact?: boolean;
  onStartLesson?: () => void;
  onPractice?: () => void;
  onMarkComplete?: () => void;
}

export function ObjectiveCard({
  objective,
  unit,
  subject,
  masteryState,
  highlighted = false,
  compact = false,
  onStartLesson,
  onPractice,
  onMarkComplete,
}: ObjectiveCardProps) {
  const openWizardFromObjective = useWizardStore(
    (state) => state.openWizardFromObjective
  );

  // Select raw state to avoid infinite loop
  const profiles = useLearnerStore((state) => state.profiles);
  const activeLearnerId = useLearnerStore((state) => state.activeLearnerId);
  const markObjectiveStarted = useLearnerStore((state) => state.markObjectiveStarted);
  const markObjectiveMastered = useLearnerStore((state) => state.markObjectiveMastered);

  // Compute activeProfile with useMemo
  const activeProfile = useMemo(() => {
    if (!activeLearnerId) return null;
    return profiles.find((p) => p.learnerId === activeLearnerId) || null;
  }, [profiles, activeLearnerId]);

  const handleStartLesson = async () => {
    if (!activeProfile) return;

    // Open wizard with pre-filled data
    // Include subject in unitTitle so openWizardFromObjective can extract it
    openWizardFromObjective(
      {
        id: objective.id,
        text: objective.text,
        difficulty: objective.difficulty,
        estimatedMinutes: objective.estimatedMinutes,
        unitTitle: `${subject} - ${unit.title}`,
        whyRecommended: "",
        vocabulary: objective.vocabulary,
        activities: objective.activities,
        misconceptions: objective.misconceptions,
      },
      activeProfile
    );

    // Mark as in progress
    await markObjectiveStarted(objective.id, subject);

    onStartLesson?.();
  };

  const handlePractice = () => {
    if (!activeProfile) return;

    // Open wizard for practice worksheet
    openWizardFromObjective(
      {
        id: objective.id,
        text: objective.text,
        difficulty: objective.difficulty,
        estimatedMinutes: 15, // Shorter for practice
        unitTitle: `${subject} - ${unit.title}`,
        whyRecommended: "Practice session",
        vocabulary: objective.vocabulary,
      },
      activeProfile,
      "worksheet" // Format: worksheet only
    );

    onPractice?.();
  };

  const handleMarkComplete = async () => {
    await markObjectiveMastered(objective.id, subject);
    onMarkComplete?.();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
        <MasteryBadge state={masteryState} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{objective.text}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            <Clock className="h-3 w-3" />
            {objective.estimatedMinutes} min
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={handleStartLesson}>
          <Play className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card
      data-objective-id={objective.id}
      className={cn(
        "group hover:shadow-md transition-shadow",
        highlighted && "border-primary ring-2 ring-primary/40 bg-primary/5"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <MasteryBadge state={masteryState} />
          <div className="flex-1 min-w-0">
            <div className="font-medium">{objective.text}</div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {objective.estimatedMinutes} min
              </span>
              <span
                className={cn(
                  "capitalize",
                  objective.difficulty === "easy" && "text-green-600",
                  objective.difficulty === "challenge" && "text-orange-600"
                )}
              >
                {objective.difficulty}
              </span>
            </div>

            {/* Misconceptions warning */}
            {masteryState === "needs_review" && objective.misconceptions?.length > 0 && (
              <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-700 dark:text-orange-300">
                <div className="flex items-center gap-1 font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  Common challenges:
                </div>
                <ul className="mt-1 ml-4 list-disc">
                  {objective.misconceptions.slice(0, 2).map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Button size="sm" onClick={handleStartLesson} className="flex-1">
            <Play className="h-4 w-4 mr-1" />
            {masteryState === "not_started" ? "Start Lesson" : "Continue"}
          </Button>
          <Button size="sm" variant="outline" onClick={handlePractice}>
            <FileText className="h-4 w-4 mr-1" />
            Practice
          </Button>
          {masteryState !== "mastered" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMarkComplete}
              title="Mark as mastered"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

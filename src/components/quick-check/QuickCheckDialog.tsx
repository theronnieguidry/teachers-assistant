import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  buildQuickCheckTemplate,
  calculateMasteryFromScore,
} from "@/lib/curriculum";
import { useLearnerStore } from "@/stores/learnerStore";
import { useWizardStore } from "@/stores/wizardStore";
import type {
  CurriculumObjective,
  LearnerProfile,
  ObjectiveRecommendation,
  QuickCheckResult,
  QuickCheckResultItem,
} from "@/types";

interface QuickCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective: CurriculumObjective;
  subject: string;
  learner: LearnerProfile;
}

type CheckpointResponse = {
  correct: boolean | null;
  note: string;
};

function toObjectiveRecommendation(
  objective: CurriculumObjective,
  subject: string
): ObjectiveRecommendation {
  return {
    id: objective.id,
    text: objective.text,
    difficulty: objective.difficulty,
    estimatedMinutes: objective.estimatedMinutes,
    unitTitle: `${subject} - Quick Check`,
    whyRecommended: "Quick Check follow-up",
    vocabulary: objective.vocabulary,
    activities: objective.activities,
    misconceptions: objective.misconceptions,
  };
}

function getRecommendationCopy(result: QuickCheckResult): string {
  switch (result.recommendation) {
    case "advance":
      return "The learner is ready to move on to the next skill.";
    case "practice":
      return "One more focused round of practice is recommended.";
    case "remediate":
      return "Targeted remediation is recommended before moving on.";
  }
}

function getMasteryCopy(score: number): string {
  const mastery = calculateMasteryFromScore(score);
  switch (mastery) {
    case "mastered":
      return "Mastery updated to mastered.";
    case "in_progress":
      return "Mastery updated to in progress.";
    case "needs_review":
      return "Mastery updated to needs review.";
    default:
      return "Mastery updated.";
  }
}

export function QuickCheckDialog({
  open,
  onOpenChange,
  objective,
  subject,
  learner,
}: QuickCheckDialogProps) {
  const template = useMemo(
    () => buildQuickCheckTemplate(objective, subject),
    [objective, subject]
  );
  const submitQuickCheck = useLearnerStore((state) => state.submitQuickCheck);
  const openWizardFromObjective = useWizardStore(
    (state) => state.openWizardFromObjective
  );
  const openWizardForRemediation = useWizardStore(
    (state) => state.openWizardForRemediation
  );

  const [responses, setResponses] = useState<Record<string, CheckpointResponse>>(
    {}
  );
  const [result, setResult] = useState<QuickCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initialResponses = Object.fromEntries(
      template.map((checkpoint) => [
        checkpoint.checkpointId,
        { correct: null, note: "" },
      ])
    );
    setResponses(initialResponses);
    setResult(null);
    setError(null);
    setIsSubmitting(false);
  }, [open, template]);

  const allAnswered = template.every(
    (checkpoint) => responses[checkpoint.checkpointId]?.correct !== null
  );

  const handleChoice = (checkpointId: string, correct: boolean) => {
    setResponses((current) => ({
      ...current,
      [checkpointId]: {
        correct,
        note: current[checkpointId]?.note || "",
      },
    }));
  };

  const handleNoteChange = (checkpointId: string, note: string) => {
    setResponses((current) => ({
      ...current,
      [checkpointId]: {
        correct: current[checkpointId]?.correct ?? null,
        note,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;

    const items: QuickCheckResultItem[] = template.map((checkpoint) => ({
      checkpointId: checkpoint.checkpointId,
      kind: checkpoint.kind,
      prompt: checkpoint.prompt,
      correct: Boolean(responses[checkpoint.checkpointId]?.correct),
      note: responses[checkpoint.checkpointId]?.note.trim() || undefined,
    }));

    setIsSubmitting(true);
    setError(null);

    try {
      const saved = await submitQuickCheck({
        objectiveId: objective.id,
        subject,
        items,
      });
      setResult(saved);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save the Quick Check"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePractice = () => {
    openWizardFromObjective(
      toObjectiveRecommendation(objective, subject),
      learner,
      "worksheet"
    );
    onOpenChange(false);
  };

  const handleRemediation = () => {
    if (!result) return;
    openWizardForRemediation(
      toObjectiveRecommendation(objective, subject),
      learner,
      result
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quick Check</DialogTitle>
          <DialogDescription>
            Review three checkpoints for {learner.displayName} in {subject.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <Alert>
              <AlertTitle>
                {result.score}% • {getMasteryCopy(result.score)}
              </AlertTitle>
              <AlertDescription>{getRecommendationCopy(result)}</AlertDescription>
            </Alert>

            {result.wrongAnswerSummary ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Missed areas</div>
                <p className="mt-1">{result.wrongAnswerSummary}</p>
              </div>
            ) : null}

            <div className="text-sm text-muted-foreground">
              Saved {new Date(result.createdAt).toLocaleString()}
            </div>

            <DialogFooter>
              {result.recommendation === "practice" ? (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Done
                  </Button>
                  <Button onClick={handlePractice}>Practice Again</Button>
                </>
              ) : result.recommendation === "remediate" ? (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Done
                  </Button>
                  <Button onClick={handleRemediation}>Generate Remediation</Button>
                </>
              ) : (
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              )}
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {template.map((checkpoint, index) => {
              const response = responses[checkpoint.checkpointId];
              return (
                <div
                  key={checkpoint.checkpointId}
                  className="rounded-lg border p-4"
                >
                  <div className="text-sm font-medium text-muted-foreground">
                    Checkpoint {index + 1}
                  </div>
                  <div className="mt-1 font-medium">{checkpoint.prompt}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={response?.correct === true ? "default" : "outline"}
                      onClick={() => handleChoice(checkpoint.checkpointId, true)}
                    >
                      Correct
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        response?.correct === false ? "destructive" : "outline"
                      }
                      onClick={() => handleChoice(checkpoint.checkpointId, false)}
                    >
                      Needs help
                    </Button>
                  </div>
                  <Textarea
                    className="mt-3 min-h-[72px]"
                    placeholder="Optional teacher note"
                    value={response?.note || ""}
                    onChange={(event) =>
                      handleNoteChange(
                        checkpoint.checkpointId,
                        event.target.value
                      )
                    }
                  />
                </div>
              );
            })}

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Quick Check failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save Quick Check"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/stores/wizardStore";
import { useProjectStore } from "@/stores/projectStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import { generateTeacherPack, GenerationApiError } from "@/services/generation-api";
import { saveTeacherPack } from "@/services/tauri-bridge";
import { cn } from "@/lib/utils";
import type { GenerationProgress } from "@/types";

export function GenerationStep() {
  const {
    isGenerating,
    generationProgress,
    generationMessage,
    generationError,
    setGenerationState,
    closeWizard,
    reset,
    prompt,
    title,
    classDetails,
    selectedInspiration,
    outputPath,
  } = useWizardStore();
  const { createProject, updateProject, updateProjectWithVersion } = useProjectStore();
  const { session } = useAuthStore();
  const startedRef = useRef(false);

  useEffect(() => {
    // Start generation when step loads (only once)
    if (!startedRef.current && !isGenerating && generationProgress === 0 && !generationError) {
      startedRef.current = true;
      startGeneration();
    }
  }, []);

  const startGeneration = async () => {
    if (!classDetails || !session?.access_token) return;

    setGenerationState({
      isGenerating: true,
      progress: 0,
      message: "Creating project...",
      error: null,
    });

    let projectId: string | null = null;

    try {
      // Create project in database
      setGenerationState({ progress: 5, message: "Saving project..." });

      const project = await createProject({
        title,
        prompt,
        grade: classDetails.grade,
        subject: classDetails.subject,
        options: {
          questionCount: classDetails.questionCount,
          includeVisuals: classDetails.includeVisuals,
          difficulty: classDetails.difficulty,
          format: classDetails.format,
          includeAnswerKey: classDetails.includeAnswerKey,
        },
        inspiration: selectedInspiration,
        outputPath: outputPath || undefined,
      });

      projectId = project.id;

      // Update project status to generating
      await updateProject(projectId, { status: "generating" });

      setGenerationState({ progress: 10, message: "Starting AI generation..." });

      // Call the Generation API
      const result = await generateTeacherPack(
        {
          projectId,
          prompt,
          grade: classDetails.grade,
          subject: classDetails.subject,
          options: {
            questionCount: classDetails.questionCount,
            includeVisuals: classDetails.includeVisuals,
            difficulty: classDetails.difficulty,
            format: classDetails.format,
            includeAnswerKey: classDetails.includeAnswerKey,
          },
          inspiration: selectedInspiration,
          aiProvider: "claude",
        },
        session.access_token,
        handleProgress
      );

      setGenerationState({ progress: 85, message: "Saving generated content..." });

      // Save version to database
      await updateProjectWithVersion(projectId, "completed", {
        versionNumber: 1,
        worksheetHtml: result.worksheetHtml,
        lessonPlanHtml: result.lessonPlanHtml,
        answerKeyHtml: result.answerKeyHtml,
        aiProvider: "claude",
        aiModel: null,
      });

      // Update credits used
      await updateProject(projectId, { creditsUsed: result.creditsUsed });

      // Save files to local folder if output path specified
      if (outputPath) {
        setGenerationState({ progress: 95, message: "Saving files to folder..." });
        try {
          await saveTeacherPack(
            outputPath,
            {
              worksheetHtml: result.worksheetHtml,
              lessonPlanHtml: result.lessonPlanHtml,
              answerKeyHtml: result.answerKeyHtml,
            },
            title
          );
        } catch (error) {
          console.error("Failed to save files locally:", error);
          // Don't fail the whole operation if local save fails
        }
      }

      setGenerationState({
        progress: 100,
        message: "Complete!",
        isGenerating: false,
      });

      toast.success(
        "Generation Complete!",
        `Your ${title} materials are ready to view and print.`
      );
    } catch (error) {
      console.error("Generation failed:", error);

      // Update project status to failed
      if (projectId) {
        try {
          await updateProject(projectId, {
            status: "failed",
            errorMessage:
              error instanceof Error ? error.message : "Generation failed",
          });
        } catch {
          // Ignore update errors
        }
      }

      let errorMessage = "Generation failed";
      if (error instanceof GenerationApiError) {
        if (error.statusCode === 402) {
          errorMessage = "Insufficient credits. Please purchase more credits to continue.";
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setGenerationState({
        isGenerating: false,
        error: errorMessage,
      });

      toast.error("Generation Failed", errorMessage);
    }
  };

  const handleProgress = (progress: GenerationProgress) => {
    const progressMap: Record<string, number> = {
      worksheet: 30,
      lesson_plan: 55,
      answer_key: 75,
      complete: 85,
    };

    setGenerationState({
      progress: progressMap[progress.step] || progress.progress,
      message: progress.message,
    });
  };

  const handleClose = () => {
    reset();
    closeWizard();
  };

  const handleRetry = () => {
    startedRef.current = false;
    setGenerationState({
      isGenerating: false,
      progress: 0,
      message: "",
      error: null,
    });
    startGeneration();
  };

  return (
    <div className="space-y-6 py-4">
      {/* Progress indicator */}
      <div className="flex flex-col items-center">
        {generationError ? (
          <XCircle className="h-16 w-16 text-destructive mb-4" />
        ) : generationProgress === 100 ? (
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
        ) : (
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-full border-4 border-muted flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>
            {isGenerating && (
              <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-primary" />
            )}
          </div>
        )}

        <h3 className="text-lg font-medium">
          {generationError
            ? "Generation Failed"
            : generationProgress === 100
            ? "Generation Complete!"
            : "Generating Your Materials"}
        </h3>

        <p className="text-sm text-muted-foreground mt-1">
          {generationError || generationMessage}
        </p>
      </div>

      {/* Progress bar */}
      {!generationError && (
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full bg-primary transition-all duration-500",
                generationProgress === 100 && "bg-green-500"
              )}
              style={{ width: `${generationProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {generationProgress}% complete
          </p>
        </div>
      )}

      {/* Summary */}
      {generationProgress === 100 && !generationError && (
        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            Your Teacher Pack has been generated successfully!
            {outputPath && " Files have been saved to your selected folder."}
          </p>
        </div>
      )}

      {/* Insufficient credits message */}
      {generationError?.includes("Insufficient credits") && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            You don't have enough credits to generate this content. Please
            purchase additional credits to continue.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-2 pt-4">
        {generationError ? (
          <>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            {!generationError.includes("Insufficient credits") && (
              <Button onClick={handleRetry}>Retry</Button>
            )}
          </>
        ) : generationProgress === 100 ? (
          <>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={handleClose}>View Project</Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Loader2, Sparkles, AlertCircle, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWizardStore } from "@/stores/wizardStore";
import { useAuthStore } from "@/stores/authStore";
import { polishPrompt, type PolishSkipReason } from "@/services/generation-api";
import { K6SoftLimitAlert } from "./K6SoftLimitAlert";

type PromptChoice = "polished" | "original" | "edited";

const SKIP_REASON_MESSAGES: Record<PolishSkipReason, string> = {
  disabled: "Prompt enhancement is disabled.",
  already_detailed: "Your prompt is already detailed enough - no enhancement needed.",
  ollama_error: "Could not connect to Ollama. Make sure Ollama is running.",
  ollama_unavailable: "Ollama is not running. Start Ollama to enable prompt enhancement, or continue with your original request.",
  invalid_response: "Received an unexpected response from Ollama.",
};

export function PromptReviewStep() {
  const {
    prompt,
    classDetails,
    selectedInspiration,
    polishedPrompt,
    setPolishedPrompt,
    setUsePolishedPrompt,
    nextStep,
    prevStep,
  } = useWizardStore();
  const { session } = useAuthStore();

  const [isPolishing, setIsPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);
  const [promptChoice, setPromptChoice] = useState<PromptChoice>("polished");
  const [editedPrompt, setEditedPrompt] = useState("");
  const [wasPolished, setWasPolished] = useState(true);
  const [skipReason, setSkipReason] = useState<PolishSkipReason | null>(null);

  // Polish the prompt when the step loads
  useEffect(() => {
    if (!polishedPrompt && classDetails && session?.access_token) {
      polishUserPrompt();
    } else if (polishedPrompt) {
      setEditedPrompt(polishedPrompt);
    }
  }, []);

  const polishUserPrompt = async () => {
    if (!classDetails || !session?.access_token) return;

    setIsPolishing(true);
    setPolishError(null);
    setSkipReason(null);

    try {
      const result = await polishPrompt(
        {
          prompt,
          grade: classDetails.grade,
          subject: classDetails.subject,
          format: classDetails.format,
          questionCount: classDetails.questionCount,
          difficulty: classDetails.difficulty,
          includeVisuals: classDetails.includeVisuals,
          inspirationTitles: selectedInspiration.map((i) => i.title || i.id),
        },
        session.access_token
      );

      setPolishedPrompt(result.polished);
      setEditedPrompt(result.polished);
      setWasPolished(result.wasPolished);

      // If polishing was skipped, store the reason and default to original
      if (!result.wasPolished) {
        setSkipReason(result.skipReason || null);
        setPromptChoice("original");
        setUsePolishedPrompt(false);
      }
    } catch (error) {
      console.error("Failed to polish prompt:", error);
      setPolishError("Could not enhance your prompt. You can continue with your original request.");
      setPromptChoice("original");
      setUsePolishedPrompt(false);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleChoiceChange = (value: PromptChoice) => {
    setPromptChoice(value);
    if (value === "original") {
      setUsePolishedPrompt(false);
      setPolishedPrompt(prompt);
    } else if (value === "polished") {
      setUsePolishedPrompt(true);
      // Reset to original polished prompt
      polishUserPrompt();
    } else {
      setUsePolishedPrompt(true);
    }
  };

  const handleEditedPromptChange = (value: string) => {
    setEditedPrompt(value);
    setPolishedPrompt(value);
  };

  const handleNext = () => {
    // Save the final prompt choice
    if (promptChoice === "original") {
      setPolishedPrompt(prompt);
      setUsePolishedPrompt(false);
    } else {
      setPolishedPrompt(editedPrompt);
      setUsePolishedPrompt(true);
    }
    nextStep();
  };

  // Loading state
  if (isPolishing) {
    return (
      <div className="space-y-6 py-8">
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <Sparkles className="h-12 w-12 text-primary" />
            <Loader2 className="absolute inset-0 h-12 w-12 animate-spin text-primary opacity-50" />
          </div>
          <h3 className="text-lg font-medium">Refining your request...</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Just a moment while we enhance your prompt
          </p>
        </div>
      </div>
    );
  }

  // Determine what will actually be sent to the AI
  const getFinalPrompt = () => {
    if (promptChoice === "original" || !wasPolished || polishError) {
      return prompt;
    }
    return editedPrompt || polishedPrompt || prompt;
  };

  const finalPrompt = getFinalPrompt();
  const promptWasChanged = wasPolished && !polishError && finalPrompt !== prompt;

  return (
    <div className="space-y-4">
      {/* Header message */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            {wasPolished && !polishError
              ? "Here's what we'll send to AI. I've enhanced your request a bit. Is there anything you'd like to change?"
              : "Here's what we'll send to AI to generate your teaching materials. Is there anything you'd like to change?"}
          </p>
        </div>
      </div>

      <K6SoftLimitAlert grade={classDetails?.grade} />

      {/* Error state */}
      {polishError && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">{polishError}</p>
        </div>
      )}

      {/* Skip reason notice */}
      {!wasPolished && skipReason && !polishError && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-start gap-2" data-testid="skip-reason-notice">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {SKIP_REASON_MESSAGES[skipReason]}
          </p>
        </div>
      )}

      {/* Final prompt - what will be sent to AI (always shown prominently) */}
      <div className="space-y-2">
        <Label>What will be sent to AI:</Label>
        {promptChoice === "edited" && wasPolished ? (
          <Textarea
            value={editedPrompt}
            onChange={(e) => handleEditedPromptChange(e.target.value)}
            className="min-h-[120px] resize-none"
            placeholder="Edit your prompt here..."
            data-testid="final-prompt-textarea"
          />
        ) : (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-md text-sm" data-testid="final-prompt-display">
            {finalPrompt}
          </div>
        )}
      </div>

      {/* Prompt choice - only show when polishing actually changed something */}
      {wasPolished && !polishError && (
        <RadioGroup
          value={promptChoice}
          onValueChange={(v) => handleChoiceChange(v as PromptChoice)}
          className="space-y-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="polished" id="polished" />
            <Label htmlFor="polished" className="cursor-pointer">
              Use enhanced version
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="original" id="original" />
            <Label htmlFor="original" className="cursor-pointer">
              Use my original request
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="edited" id="edited" />
            <Label htmlFor="edited" className="cursor-pointer">
              Edit the prompt
            </Label>
          </div>
        </RadioGroup>
      )}

      {/* Original prompt - shown as reference when different from final */}
      {promptWasChanged && promptChoice !== "original" && (
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Your original request:</Label>
          <div className="p-2 bg-muted/30 rounded-md text-xs text-muted-foreground">
            {prompt}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button onClick={handleNext}>
          Continue
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

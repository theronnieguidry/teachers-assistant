import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Bug, Lightbulb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { feedbackSchema, type FeedbackFormData } from "@/lib/validators";
import { submitFeedback } from "@/services/feedback-api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/stores/toastStore";

// Get app version from package.json via Vite
const APP_VERSION = __APP_VERSION__ || "unknown";

// Declare the global for TypeScript
declare const __APP_VERSION__: string | undefined;

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { session, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: "bug",
      title: "",
      description: "",
      contactEmail: profile?.email || "",
    },
  });

  const onSubmit = async (data: FeedbackFormData) => {
    if (!session?.access_token) {
      setError("You must be logged in to submit feedback");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitFeedback(
        {
          type: data.type,
          title: data.title,
          description: data.description,
          contactEmail: data.contactEmail || undefined,
          appVersion: APP_VERSION,
        },
        session.access_token
      );

      toast.success(
        "Feedback submitted",
        `Thank you! Issue #${result.issueNumber} has been created.`
      );

      reset();
      onOpenChange(false);
    } catch (err) {
      console.error("Feedback submission error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to submit feedback"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Report a bug or suggest a feature. Your feedback helps us improve.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Feedback Type */}
          <div className="space-y-3">
            <Label>What type of feedback?</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex gap-4"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="bug" id="feedback-bug" />
                    <Bug className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Bug Report</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="feature" id="feedback-feature" />
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Feature Request</span>
                  </label>
                </RadioGroup>
              )}
            />
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="feedback-title">Title *</Label>
            <Input
              id="feedback-title"
              placeholder="Brief summary of your feedback"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="feedback-description">Description *</Label>
            <Textarea
              id="feedback-description"
              placeholder="Please provide details. For bugs, include steps to reproduce."
              className="min-h-[120px]"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="feedback-email">
              Contact Email{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="feedback-email"
              type="email"
              placeholder="For follow-up questions"
              {...register("contactEmail")}
            />
            {errors.contactEmail && (
              <p className="text-sm text-destructive">
                {errors.contactEmail.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit Feedback
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

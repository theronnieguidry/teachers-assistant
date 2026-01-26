import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLearnerStore } from "@/stores/learnerStore";
import { toast } from "@/stores/toastStore";
import { AVATAR_EMOJIS, type Grade, type TeachingConfidence, type SessionDuration } from "@/types";
import { Loader2 } from "lucide-react";

interface CreateLearnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const createLearnerSchema = z.object({
  displayName: z
    .string()
    .min(1, "Name is required")
    .max(30, "Name must be 30 characters or less"),
  grade: z.enum(["K", "1", "2", "3", "4", "5", "6"] as const),
  avatarEmoji: z.string().optional(),
  sessionDuration: z.coerce.number().refine((n) => [15, 30, 45, 60].includes(n)),
  adultConfidence: z.enum(["novice", "intermediate", "experienced"] as const),
});

type CreateLearnerFormData = z.infer<typeof createLearnerSchema>;

const gradeOptions: { value: Grade; label: string }[] = [
  { value: "K", label: "Kindergarten" },
  { value: "1", label: "1st Grade" },
  { value: "2", label: "2nd Grade" },
  { value: "3", label: "3rd Grade" },
  { value: "4", label: "4th Grade" },
  { value: "5", label: "5th Grade" },
  { value: "6", label: "6th Grade" },
];

const sessionOptions: { value: SessionDuration; label: string }[] = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
];

const confidenceOptions: { value: TeachingConfidence; label: string; description: string }[] = [
  {
    value: "novice",
    label: "I'm new to teaching",
    description: "Show me step-by-step teacher scripts",
  },
  {
    value: "intermediate",
    label: "Some experience",
    description: "Give me guidelines but let me adapt",
  },
  {
    value: "experienced",
    label: "Experienced teacher",
    description: "Just the essentials, please",
  },
];

export function CreateLearnerDialog({ open, onOpenChange }: CreateLearnerDialogProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>(AVATAR_EMOJIS[0]);
  const createProfile = useLearnerStore((state) => state.createProfile);
  const isLoading = useLearnerStore((state) => state.isLoading);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateLearnerFormData>({
    resolver: zodResolver(createLearnerSchema),
    defaultValues: {
      displayName: "",
      grade: "2",
      avatarEmoji: AVATAR_EMOJIS[0],
      sessionDuration: 30,
      adultConfidence: "intermediate",
    },
  });

  const onSubmit = async (data: CreateLearnerFormData) => {
    try {
      await createProfile({
        displayName: data.displayName,
        grade: data.grade,
        avatarEmoji: selectedEmoji,
        preferences: {
          favoriteSubjects: [],
          sessionDuration: data.sessionDuration as SessionDuration,
          visualLearner: true,
        },
        adultConfidence: data.adultConfidence,
      });

      toast.success("Learner created", `${data.displayName} is ready to start learning!`);
      reset();
      setSelectedEmoji(AVATAR_EMOJIS[0]);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        "Failed to create learner",
        error instanceof Error ? error.message : "Please try again"
      );
    }
  };

  const handleClose = () => {
    reset();
    setSelectedEmoji(AVATAR_EMOJIS[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Learner</DialogTitle>
          <DialogDescription>
            Create a profile to track their learning progress
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Picker */}
          <div className="space-y-2">
            <Label>Choose an avatar</Label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-10 h-10 text-2xl rounded-full flex items-center justify-center transition-all ${
                    selectedEmoji === emoji
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Name or nickname</Label>
            <Input
              id="displayName"
              placeholder="e.g., Emma, Little Scholar"
              {...register("displayName")}
            />
            {errors.displayName && (
              <p className="text-sm text-destructive">{errors.displayName.message}</p>
            )}
          </div>

          {/* Grade */}
          <div className="space-y-2">
            <Label>Grade level</Label>
            <Controller
              name="grade"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Session Duration */}
          <div className="space-y-2">
            <Label>Preferred lesson length</Label>
            <Controller
              name="sessionDuration"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(val) => field.onChange(parseInt(val))}
                  value={field.value?.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Teaching Confidence */}
          <div className="space-y-3">
            <Label>Your teaching experience</Label>
            <Controller
              name="adultConfidence"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="space-y-2"
                >
                  {confidenceOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        field.value === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value={option.value} className="mt-0.5" />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Add Learner"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

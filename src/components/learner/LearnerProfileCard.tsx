import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useLearnerStore } from "@/stores/learnerStore";
import { toast } from "@/stores/toastStore";
import { AVATAR_EMOJIS, type LearnerProfile, type Grade, type SessionDuration } from "@/types";
import { Pencil, Trash2, Loader2 } from "lucide-react";

interface LearnerProfileCardProps {
  profile: LearnerProfile;
  showActions?: boolean;
}

const editSchema = z.object({
  displayName: z.string().min(1).max(30),
  grade: z.enum(["K", "1", "2", "3", "4", "5", "6"] as const),
  sessionDuration: z.coerce.number().refine((n) => [15, 30, 45, 60].includes(n)),
});

type EditFormData = z.infer<typeof editSchema>;

const gradeLabels: Record<Grade, string> = {
  K: "Kindergarten",
  "1": "1st Grade",
  "2": "2nd Grade",
  "3": "3rd Grade",
  "4": "4th Grade",
  "5": "5th Grade",
  "6": "6th Grade",
};

export function LearnerProfileCard({ profile, showActions = true }: LearnerProfileCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(profile.avatarEmoji || "🎓");

  const updateProfile = useLearnerStore((state) => state.updateProfile);
  const deleteProfile = useLearnerStore((state) => state.deleteProfile);
  const isLoading = useLearnerStore((state) => state.isLoading);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      displayName: profile.displayName,
      grade: profile.grade,
      sessionDuration: profile.preferences.sessionDuration,
    },
  });

  const onSubmit = async (data: EditFormData) => {
    try {
      await updateProfile(profile.learnerId, {
        displayName: data.displayName,
        grade: data.grade,
        avatarEmoji: selectedEmoji,
        preferences: {
          ...profile.preferences,
          sessionDuration: data.sessionDuration as SessionDuration,
        },
      });
      toast.success("Profile updated");
      setEditOpen(false);
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProfile(profile.learnerId);
      toast.success("Learner removed", `${profile.displayName}'s data has been deleted`);
      setDeleteConfirmOpen(false);
    } catch (error) {
      toast.error("Failed to delete learner");
    }
  };

  const openEdit = () => {
    reset({
      displayName: profile.displayName,
      grade: profile.grade,
      sessionDuration: profile.preferences.sessionDuration,
    });
    setSelectedEmoji(profile.avatarEmoji || "🎓");
    setEditOpen(true);
  };

  return (
    <>
      <Card className="group relative">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                {profile.avatarEmoji || "🎓"}
              </div>
              <div>
                <CardTitle className="text-lg">{profile.displayName}</CardTitle>
                <CardDescription>{gradeLabels[profile.grade]}</CardDescription>
              </div>
            </div>
            {showActions && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={openEdit}>
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {profile.preferences.sessionDuration} min lessons
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Learner</DialogTitle>
            <DialogDescription>Update {profile.displayName}'s profile</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Avatar Picker */}
            <div className="space-y-2">
              <Label>Avatar</Label>
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
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" {...register("displayName")} />
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(gradeLabels) as [Grade, string][]).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Session Duration */}
            <div className="space-y-2">
              <Label>Lesson length</Label>
              <Controller
                name="sessionDuration"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value?.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Learner?</DialogTitle>
            <DialogDescription>
              This will permanently delete {profile.displayName}'s profile and all their
              learning progress. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

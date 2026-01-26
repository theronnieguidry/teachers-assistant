import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useLearnerStore } from "@/stores/learnerStore";
import { CreateLearnerDialog } from "./CreateLearnerDialog";
import { UserPlus } from "lucide-react";

interface LearnerSwitcherProps {
  compact?: boolean;
}

export function LearnerSwitcher({ compact = false }: LearnerSwitcherProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const profiles = useLearnerStore((state) => state.profiles);
  const activeLearnerId = useLearnerStore((state) => state.activeLearnerId);
  const setActiveLearner = useLearnerStore((state) => state.setActiveLearner);
  const loadProfiles = useLearnerStore((state) => state.loadProfiles);
  const isLoading = useLearnerStore((state) => state.isLoading);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const activeProfile = profiles.find((p) => p.learnerId === activeLearnerId);

  // No learners yet - show add button
  if (profiles.length === 0) {
    return (
      <>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {!compact && "Add Learner"}
        </Button>
        <CreateLearnerDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={activeLearnerId || ""}
          onValueChange={(value) => {
            if (value === "add-new") {
              setCreateDialogOpen(true);
            } else {
              setActiveLearner(value);
            }
          }}
          disabled={isLoading}
        >
          <SelectTrigger className={compact ? "w-[140px]" : "w-[180px]"}>
            <SelectValue placeholder="Select learner">
              {activeProfile && (
                <span className="flex items-center gap-2">
                  <span>{activeProfile.avatarEmoji || "🎓"}</span>
                  <span className="truncate">{activeProfile.displayName}</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {profiles.map((profile) => (
              <SelectItem key={profile.learnerId} value={profile.learnerId}>
                <span className="flex items-center gap-2">
                  <span>{profile.avatarEmoji || "🎓"}</span>
                  <span>{profile.displayName}</span>
                  <span className="text-muted-foreground text-xs">
                    Grade {profile.grade}
                  </span>
                </span>
              </SelectItem>
            ))}
            <SelectItem value="add-new" className="text-primary">
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>Add Learner</span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CreateLearnerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
}
